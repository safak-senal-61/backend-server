import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface VideoRoom {
  id: number;
  roomId: string;
  name: string;
  description?: string;
  hostId: number;
  isActive: boolean;
  maxParticipants: number;
  createdAt: string;
}

interface VideoChatProps {
  isConnected: boolean;
}

export default function VideoChat({ isConnected }: VideoChatProps) {
  const [videoRooms, setVideoRooms] = useState<VideoRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<VideoRoom | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [roomParticipants, setRoomParticipants] = useState<{[roomId: string]: number}>({});
  const [wsClientId, setWsClientId] = useState<string | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<string[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Fetch active video rooms
  const fetchVideoRooms = async () => {
    try {
      const response = await fetch("/api/video/rooms");
      const rooms = await response.json();
      setVideoRooms(rooms);
    } catch (error) {
      console.error("Failed to fetch video rooms:", error);
    }
  };

  // Initialize WebSocket connection for video chat
  useEffect(() => {
    if (isConnected) {
      fetchVideoRooms();
      const interval = setInterval(fetchVideoRooms, 5000);
      
      // Initialize WebSocket connection
      initializeWebSocket();
      
      return () => {
        clearInterval(interval);
        if (websocket) {
          websocket.close();
        }
      };
    }
  }, [isConnected]);

  // Ensure video stream is connected when localStream changes
  useEffect(() => {
    if (localStream && localVideoRef.current && !localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => {
        console.log("Local video play failed:", e);
      });
    }
  }, [localStream]);

  const initializeWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('Video Chat WebSocket - Connecting to:', wsUrl);
    console.log('Video Chat WebSocket - Protocol:', protocol, 'Host:', host);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("✅ VIDEO CHAT WebSocket connected successfully to:", wsUrl);
        setWebsocket(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Video Chat WebSocket message received:", message.type, message);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error("Error parsing Video Chat WebSocket message:", error);
        }
      };
      
      ws.onclose = () => {
        console.log("Video Chat WebSocket disconnected");
        setWebsocket(null);
        setWsClientId(null);
        
        if (isConnected) {
          setTimeout(() => {
            if (isConnected) {
              console.log("Video Chat WebSocket - Attempting reconnection...");
              initializeWebSocket();
            }
          }, 3000);
        }
      };
      
      ws.onerror = (error) => {
        console.error("Video Chat WebSocket connection error:", error);
      };
    } catch (error) {
      console.error("Failed to create Video Chat WebSocket:", error);
    }
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'connection':
        setWsClientId(message.clientId);
        break;
        
      case 'room-joined':
        setParticipantCount(message.participantCount);
        setRoomParticipants(prev => ({
          ...prev,
          [message.roomId]: message.participantCount
        }));
        console.log(`Joined room ${message.roomId} with ${message.participantCount} participants`);
        break;
        
      case 'participant-joined':
        setParticipantCount(message.participantCount);
        if (message.roomId) {
          setRoomParticipants(prev => ({
            ...prev,
            [message.roomId]: message.participantCount
          }));
        }
        
        // Track remote participants
        if (message.clientId && message.clientId !== wsClientId) {
          setRemoteParticipants(prev => {
            if (!prev.includes(message.clientId)) {
              return [...prev, message.clientId];
            }
            return prev;
          });
        }
        
        console.log(`New participant joined: ${message.clientId}. Total: ${message.participantCount}`);
        
        // If we're already in a call and someone new joins, initiate WebRTC connection
        if (isInCall && peerConnectionRef.current && localStream && message.clientId && message.clientId !== wsClientId) {
          console.log('Creating offer for new participant:', message.clientId);
          
          // Create a fresh peer connection for this participant
          setupPeerConnection(localStream);
          
          setTimeout(() => {
            if (peerConnectionRef.current) {
              peerConnectionRef.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
              })
                .then(offer => {
                  return peerConnectionRef.current!.setLocalDescription(offer).then(() => offer);
                })
                .then(offer => {
                  if (websocket && websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({
                      type: 'webrtc-signal',
                      signalType: 'offer',
                      signal: offer,
                      targetClientId: message.clientId
                    }));
                    console.log('Sent offer to:', message.clientId);
                  }
                })
                .catch(error => {
                  console.error('Error creating offer for new participant:', error);
                });
            }
          }, 1000); // Small delay to ensure connection is ready
        }
        break;
        
      case 'participant-left':
        setParticipantCount(message.participantCount);
        if (message.roomId) {
          setRoomParticipants(prev => ({
            ...prev,
            [message.roomId]: message.participantCount
          }));
        }
        
        // Remove from remote participants
        if (message.clientId) {
          setRemoteParticipants(prev => prev.filter(id => id !== message.clientId));
        }
        
        console.log(`Participant left: ${message.clientId}. Total: ${message.participantCount}`);
        break;
        
      case 'webrtc-signal':
        handleWebRTCSignal(message);
        break;
        
      case 'room-left':
        setParticipantCount(0);
        break;
        
      case 'error':
        console.error("WebSocket error:", message.message);
        break;
    }
  };

  const handleWebRTCSignal = async (message: any) => {
    const { fromClientId, signalType, signal } = message;
    
    console.log(`Received ${signalType} from ${fromClientId}`);
    
    if (!peerConnectionRef.current) {
      console.log('No peer connection, creating new one');
      if (localStream) {
        setupPeerConnection(localStream);
      }
      return;
    }
    
    try {
      switch (signalType) {
        case 'offer':
          console.log('Processing offer');
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          // Send answer back
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              type: 'webrtc-signal',
              targetClientId: fromClientId,
              signalType: 'answer',
              signal: answer
            }));
            console.log('Sent answer to:', fromClientId);
          }
          break;
          
        case 'answer':
          console.log('Processing answer');
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          break;
          
        case 'ice-candidate':
          console.log('Processing ICE candidate');
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal));
          break;
      }
    } catch (error) {
      console.error("Error handling WebRTC signal:", error);
    }
  };

  // Create a new video room
  const createRoom = async () => {
    try {
      const roomData = {
        roomId: `room_${Date.now()}`,
        name: `Video Room ${videoRooms.length + 1}`,
        description: "New video chat room",
        hostId: 1, // Mock user ID
        maxParticipants: 10
      };

      const response = await apiRequest("POST", "/api/video/rooms", roomData);

      if (response.ok) {
        fetchVideoRooms();
      }
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  };

  // Join a video room
  const joinRoom = async (room: VideoRoom) => {
    try {
      setCurrentRoom(room);
      
      // Use WebSocket to join room for real-time signaling
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'join-room',
          roomId: room.roomId
        }));
        
        await startVideo();
        setIsInCall(true);
      } else {
        console.error("WebSocket not connected");
      }
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  };

  // Start video stream
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      setLocalStream(stream);
      
      // Wait for the video element to be ready and set the stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        
        // Ensure video plays
        try {
          await localVideoRef.current.play();
        } catch (playError) {
          console.log("Video autoplay failed, user interaction needed:", playError);
        }
      }

      // Setup WebRTC peer connection
      setupPeerConnection(stream);
      
      console.log("Video stream started successfully");
    } catch (error) {
      console.error("Failed to start video:", error);
      
      // Try with lower constraints if the first attempt fails
      try {
        const basicStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        setLocalStream(basicStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = basicStream;
          await localVideoRef.current.play();
        }
        
        setupPeerConnection(basicStream);
        console.log("Basic video stream started");
      } catch (basicError) {
        console.error("Failed to start basic video:", basicError);
      }
    }
  };

  // Setup WebRTC peer connection
  const setupPeerConnection = (stream: MediaStream) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    // Add local stream to peer connection
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Remote stream received:', event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(e => {
          console.log('Remote video play failed:', e);
        });
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && websocket && websocket.readyState === WebSocket.OPEN) {
        // Send ICE candidate via WebSocket
        websocket.send(JSON.stringify({
          type: 'webrtc-signal',
          signalType: 'ice-candidate',
          signal: event.candidate
        }));
      }
    };

    // Create offer for new connections
    peerConnection.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: 'webrtc-signal',
            signalType: 'offer',
            signal: offer
          }));
        }
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    };
  };

  // Send WebRTC signaling data
  const sendSignal = async (type: string, data: any) => {
    if (!currentRoom) return;

    try {
      await apiRequest("POST", "/api/webrtc/signal", {
        type,
        signal: data,
        roomId: currentRoom.roomId,
        fromUserId: 1,
        targetUserId: 2 // Mock target user
      });
    } catch (error) {
      console.error("Failed to send signal:", error);
    }
  };

  // Leave current room
  const leaveRoom = async () => {
    if (!currentRoom) return;

    try {
      // Use WebSocket to leave room
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'leave-room',
          roomId: currentRoom.roomId
        }));
      }

      // Clean up media streams
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      setCurrentRoom(null);
      setIsInCall(false);
      setParticipantCount(0);
      fetchVideoRooms();
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Chat
          </CardTitle>
          <CardDescription>
            Connect to the server to access video chat features
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isInCall && currentRoom) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {currentRoom.name}
            </span>
            <div className="flex gap-2">
              <Badge variant="secondary">In Call</Badge>
              <Badge variant="outline">{participantCount} Participant{participantCount !== 1 ? 's' : ''}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video containers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }} // Mirror the local video
                onLoadedData={() => console.log("Local video loaded")}
                onPlay={() => console.log("Local video playing")}
                onError={(e) => console.error("Local video error:", e)}
              />
              <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                You {localStream && `(${localStream.getVideoTracks().length > 0 ? 'Video' : 'Audio only'})`}
              </div>
              {!localStream && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-75">Camera starting...</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden aspect-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                Remote User
              </div>
            </div>
          </div>

          {/* Call controls */}
          <div className="flex justify-center gap-4">
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleVideo}
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleAudio}
            >
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            
            <Button variant="destructive" size="sm" onClick={leaveRoom}>
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Chat Rooms
          </span>
          <Button size="sm" onClick={createRoom}>
            Create Room
          </Button>
        </CardTitle>
        <CardDescription>
          Join or create video chat rooms for real-time communication
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {videoRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active video rooms. Create one to get started!
            </div>
          ) : (
            videoRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{room.name}</h4>
                  {room.description && (
                    <p className="text-sm text-muted-foreground">{room.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {roomParticipants[room.roomId] || 0}/{room.maxParticipants}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Host: {room.hostId}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" onClick={() => joinRoom(room)}>
                  Join
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}