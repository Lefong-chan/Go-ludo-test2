const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
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
            slot:        0,
          }
        }
      });

      await roomRef.child(`players/${myUid}`).onDisconnect().remove();

      return res.status(200).json({ roomId });
    }

    // ════════════════════════════════════════════════════════════
    // SEND INVITATION (Challenge)
    // POST /api/room?action=send-invite
    // Headers: Authorization: Bearer <idToken>
    // body: { targetFirebaseUid, roomId, inviterUsername }
    // ════════════════════════════════════════════════════════════
    if (action === 'send-invite') {
      const myUid = await verifyToken(req);
      const { targetFirebaseUid, roomId, inviterUsername } = req.body;

      if (!targetFirebaseUid || !roomId)
        return res.status(400).json({ message: 'targetFirebaseUid and roomId required' });

      if (targetFirebaseUid === myUid)
        return res.status(400).json({ message: 'Cannot invite yourself' });

      const inviteRef = rtdb.ref(`invitations/${targetFirebaseUid}`);
      await inviteRef.set({
        inviterUid:      myUid,
        inviterUsername: inviterUsername || 'Someone',
        roomId,
        sentAt:          Date.now(),
        status:          'pending',
      });

      await inviteRef.onDisconnect().remove();

      return res.status(200).json({ message: 'Invitation sent.', roomId });
    }

    // ════════════════════════════════════════════════════════════
    // JOIN ROOM
    // POST /api/room?action=join-room
    // Headers: Authorization: Bearer <idToken>
    // body: { roomId, username, avatar }
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

      const currentPlayers = roomData.players ? Object.keys(roomData.players).length : 0;
      if (currentPlayers >= 4)
        return res.status(409).json({ message: 'Room is full' });

      const now       = Date.now();
      const playerRef = roomRef.child(`players/${myUid}`);

      await playerRef.set({
        firebaseUid: myUid,
        username:    username || 'Player',
        avatar:      avatar   || '👤',
        joinedAt:    now,
        slot:        currentPlayers,
      });

      await playerRef.onDisconnect().remove();

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
