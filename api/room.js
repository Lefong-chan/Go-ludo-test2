const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential:  admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL ||
                 'https://go-ludo-gascar-default-rtdb.europe-west1.firebasedatabase.app',
  });
}

const db   = admin.firestore();
const rtdb = admin.database();

const verifyToken = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('NO_TOKEN');
  const idToken      = authHeader.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken.uid;
};

const generateRoomId = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { searchParams } = new URL(req.url, 'http://localhost');
  const action = searchParams.get('action');

  try {

    // ════════════════════════════════════════════════════════════
    // CREATE ROOM
    // POST /api/room?action=create-room
    // Headers: Authorization: Bearer <idToken>
    // body: { username, avatar }
    // Ny host dia manana slot: 0 mandrakariva (Rouge)
    // ════════════════════════════════════════════════════════════
    if (action === 'create-room') {
      const myUid = await verifyToken(req);
      const { username, avatar } = req.body;

      const roomId  = generateRoomId();
      const now     = Date.now();
      const roomRef = rtdb.ref(`rooms/${roomId}`);

      await roomRef.set({
        hostUid:   myUid,
        status:    'waiting',   // 'waiting' | 'starting' | 'playing' | 'finished'
        createdAt: now,
        players: {
          [myUid]: {
            firebaseUid: myUid,
            username:    username || 'Player',
            avatar:      avatar   || '👤',
            joinedAt:    now,
            slot:        0,         // Host = slot 0 (Rouge) mandrakariva
            ready:       false,
            online:      true,
          }
        }
      });

      // onDisconnect: fafao ny player raha niala tsy nahandro
      // ary mametraka lastNetworkLost mba hahitan'ny hafa fa tsy misy reseau izy
      await roomRef.child(`players/${myUid}`).onDisconnect().update({
        online:          false,
        lastNetworkLost: admin.database.ServerValue.TIMESTAMP,
        ready:           false,   // Auto Not-Ready rehefa tsy misy reseau
      });

      return res.status(200).json({ roomId });
    }

    // ════════════════════════════════════════════════════════════
    // SEND INVITATION (Challenge)
    // POST /api/room?action=send-invite
    // Headers: Authorization: Bearer <idToken>
    // body: { targetFirebaseUid, roomId, inviterUsername, targetSlot }
    //   targetSlot: slot (0-3) nanaovana + amin'ny ModalRoom (slot color)
    // ════════════════════════════════════════════════════════════
    if (action === 'send-invite') {
      const myUid = await verifyToken(req);
      const { targetFirebaseUid, roomId, inviterUsername, targetSlot } = req.body;

      if (!targetFirebaseUid || !roomId)
        return res.status(400).json({ message: 'targetFirebaseUid and roomId required' });

      if (targetFirebaseUid === myUid)
        return res.status(400).json({ message: 'Cannot invite yourself' });

      // Jerena raha efa feno ilay slot
      const roomSnap = await rtdb.ref(`rooms/${roomId}/players`).once('value');
      const currentPlayers = roomSnap.val() || {};

      // Raha targetSlot voatondro ary efa misy olona eo, diso
      if (typeof targetSlot === 'number') {
        const slotTaken = Object.values(currentPlayers).some(p => p.slot === targetSlot);
        if (slotTaken) {
          return res.status(409).json({ message: 'Slot already taken' });
        }
      }

      // Manoratra invitation ao amin'ny RTDB (realtime) ho an'ilay target
      // Asiana targetSlot mba ahafahan'ny join-room mahataho ilay slot correct
      const inviteRef = rtdb.ref(`invitations/${targetFirebaseUid}`);
      await inviteRef.set({
        inviterUid:      myUid,
        inviterUsername: inviterUsername || 'Someone',
        roomId,
        targetSlot:      typeof targetSlot === 'number' ? targetSlot : null,
        sentAt:          Date.now(),
        status:          'pending',
      });

      // onDisconnect: fafao ny invitation raha niala ilay inviter
      await inviteRef.onDisconnect().remove();

      return res.status(200).json({ message: 'Invitation sent.', roomId });
    }

    // ════════════════════════════════════════════════════════════
    // JOIN ROOM
    // POST /api/room?action=join-room
    // Headers: Authorization: Bearer <idToken>
    // body: { roomId, username, avatar }
    //
    // Ny slot assignment:
    //   - Raha misy invitation misy targetSlot → mampiasa ilay slot
    //   - Raha tsy misy → mitady slot vide (1, 2, 3 araka ny filany)
    //   - Slot 0 = RESERVED ho an'ny host; tsy azon'ny guest aleha
    // ════════════════════════════════════════════════════════════
    if (action === 'join-room') {
      const myUid = await verifyToken(req);
      const { roomId, username, avatar } = req.body;

      if (!roomId) return res.status(400).json({ message: 'roomId required' });

      const roomRef  = rtdb.ref(`rooms/${roomId}`);
      const roomSnap = await roomRef.once('value');

      if (!roomSnap.exists())
        return res.status(404).json({ message: 'Room not found' });

      const roomData = roomSnap.val();

      if (roomData.status !== 'waiting')
        return res.status(409).json({ message: 'Game already started' });

      const currentPlayers = roomData.players ? Object.values(roomData.players) : [];

      // Raha efa ao izy (reconnect), tsy manova slot
      const existingPlayer = currentPlayers.find(p => p.firebaseUid === myUid);
      if (existingPlayer) {
        await roomRef.child(`players/${myUid}`).update({
          username: username || existingPlayer.username,
          avatar:   avatar   || existingPlayer.avatar,
          online:   true,
          lastNetworkLost: null,
        });
        return res.status(200).json({ message: 'Rejoined room.', roomId });
      }

      if (currentPlayers.length >= 4)
        return res.status(409).json({ message: 'Room is full' });

      // Jerena raha misy invitation misy targetSlot
      const inviteSnap = await rtdb.ref(`invitations/${myUid}`).once('value');
      const invite = inviteSnap.val();

      let assignedSlot = null;

      // Raha misy targetSlot amin'ny invitation ary misy room iray
      if (invite && invite.roomId === roomId && typeof invite.targetSlot === 'number') {
        const slotRequested = invite.targetSlot;
        const slotTaken = currentPlayers.some(p => p.slot === slotRequested);
        if (!slotTaken) {
          assignedSlot = slotRequested;
        }
      }

      // Raha tsy voatendry slot (tsy misy invitation na slot efa feno),
      // mitady slot vide 1-3 (slot 0 = host)
      if (assignedSlot === null) {
        const usedSlots = new Set(currentPlayers.map(p => p.slot));
        for (let s = 1; s <= 3; s++) {
          if (!usedSlots.has(s)) { assignedSlot = s; break; }
        }
      }

      if (assignedSlot === null)
        return res.status(409).json({ message: 'Room is full' });

      const now       = Date.now();
      const playerRef = roomRef.child(`players/${myUid}`);

      await playerRef.set({
        firebaseUid: myUid,
        username:    username || 'Player',
        avatar:      avatar   || '👤',
        joinedAt:    now,
        slot:        assignedSlot,
        ready:       false,
        online:      true,
        lastNetworkLost: null,
      });

      // onDisconnect: mametraka lastNetworkLost + tsy ready rehefa niala tsy nahandro
      await playerRef.onDisconnect().update({
        online:          false,
        lastNetworkLost: admin.database.ServerValue.TIMESTAMP,
        ready:           false,
      });

      // Fafao ny invitation rehefa nanao join
      await rtdb.ref(`invitations/${myUid}`).remove();

      return res.status(200).json({ message: 'Joined room.', roomId });
    }

    // ════════════════════════════════════════════════════════════
    // LEAVE ROOM
    // POST /api/room?action=leave-room
    // Headers: Authorization: Bearer <idToken>
    // body: { roomId }
    // ════════════════════════════════════════════════════════════
    if (action === 'leave-room') {
      const myUid = await verifyToken(req);
      const { roomId } = req.body;

      if (!roomId) return res.status(400).json({ message: 'roomId required' });

      const playerRef = rtdb.ref(`rooms/${roomId}/players/${myUid}`);
      await playerRef.remove();

      // Ra tsy misy olona intsony dia fafao ny room
      const playersSnap = await rtdb.ref(`rooms/${roomId}/players`).once('value');
      if (!playersSnap.exists() || Object.keys(playersSnap.val() || {}).length === 0) {
        await rtdb.ref(`rooms/${roomId}`).remove();
      }

      return res.status(200).json({ message: 'Left room.' });
    }

    // ════════════════════════════════════════════════════════════
    // LIST PLAYERS
    // GET /api/room?action=list-players&roomId=XXXX
    // Headers: Authorization: Bearer <idToken>
    // ════════════════════════════════════════════════════════════
    if (action === 'list-players') {
      await verifyToken(req);
      const roomId = searchParams.get('roomId');

      if (!roomId) return res.status(400).json({ message: 'roomId required' });

      const snap = await rtdb.ref(`rooms/${roomId}/players`).once('value');
      const data = snap.val() || {};

      const players = Object.values(data).map(p => ({
        firebaseUid: p.firebaseUid,
        username:    p.username,
        avatar:      p.avatar,
        slot:        p.slot,
        joinedAt:    p.joinedAt,
        ready:       p.ready,
        online:      p.online,
      }));

      return res.status(200).json({ players, count: players.length });
    }

    // ════════════════════════════════════════════════════════════
    // DECLINE INVITATION
    // POST /api/room?action=decline-invite
    // Headers: Authorization: Bearer <idToken>
    // body: { inviterUid }
    // ════════════════════════════════════════════════════════════
    if (action === 'decline-invite') {
      const myUid = await verifyToken(req);
      await rtdb.ref(`invitations/${myUid}`).remove();
      return res.status(200).json({ message: 'Invitation declined.' });
    }

    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error) {
    console.error('Room API Error:', error);

    if (error.message === 'NO_TOKEN') {
      return res.status(401).json({ message: 'No token provided' });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    res.status(400).json({ message: error.message });
  }
};
