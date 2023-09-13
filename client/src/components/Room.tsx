import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { wsUrl } from "../constants";

const Room = () => {
  const { roomId } = useParams();

  const userVideo = useRef<HTMLVideoElement | null>(null);
  const userStream = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const partnerVideo = useRef<HTMLVideoElement | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const joinSentRef = useRef(false);

  async function openCamera() {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const cameras = allDevices.filter((device) => device.kind === "videoinput");
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: {
        deviceId: cameras[0].deviceId,
      },
    };

    return navigator.mediaDevices.getUserMedia(constraints);
  }

  function wsOpenHandler() {
    console.log("websocket connection opened");
    websocketRef.current?.send(JSON.stringify({ join: true }));
    joinSentRef.current = true;
  }

  async function wsMessageHandler(e: MessageEvent<any>) {
    const message = JSON.parse(e.data);

    if (message.join) {
      callUser();
    }

    if (message.iceCandidate) {
      console.log("receiving and adding ice candidate");

      try {
        await peerRef.current?.addIceCandidate(message.iceCandidate);
      } catch (err) {
        console.error("failed to add ice candidate in peer ref =>", err);
      }
    }

    if (message.offer) {
      handleOffer(message.offer);
    }

    if (message.answer) {
      console.log("receiving answer");
      peerRef.current?.setRemoteDescription(new RTCSessionDescription(message.answer));
    }
  }

  useEffect(() => {
    openCamera()
      .then((stream) => {
        userVideo.current && (userVideo.current.srcObject = stream);
        userStream.current = stream;

        websocketRef.current = new WebSocket(`${wsUrl}/join?roomId=${roomId}`);

        websocketRef.current.addEventListener("open", wsOpenHandler);
        websocketRef.current.addEventListener("message", wsMessageHandler);
        websocketRef.current.addEventListener("close", (e) => console.log("closing websocket connection", e));
        websocketRef.current.addEventListener("error", (e) => console.log("error in websocket connection =>", e));
      })
      .catch((err) => {
        console.error("open camera error =>", err.message);
      });

    return () => {
      websocketRef.current?.removeEventListener("open", wsOpenHandler);
      websocketRef.current?.removeEventListener("message", wsMessageHandler);
      websocketRef.current?.close();
    };
  }, [roomId]);

  // initiate rtc connection
  function callUser() {
    console.log("calling other user");
    peerRef.current = createPeer();

    userStream.current?.getTracks().forEach((track) => {
      peerRef.current?.addTrack(track, userStream.current as any);
    });
  }

  function createPeer() {
    console.log("creating peer connection");
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onnegotiationneeded = handleNegotiationNeeded;
    peer.onicecandidate = handleIceCandidate;
    peer.ontrack = handleTrack;

    return peer;
  }

  async function handleNegotiationNeeded(e: Event) {
    console.log("creating offer");

    try {
      const myOffer = await peerRef.current?.createOffer();
      await peerRef.current?.setLocalDescription(myOffer);

      websocketRef.current?.send(JSON.stringify({ offer: peerRef.current?.localDescription }));
    } catch (err) {
      console.error("failed to create offer =>", err);
    }
  }

  function handleIceCandidate(e: RTCPeerConnectionIceEvent) {
    console.log("found ice candidate");

    if (e.candidate) {
      console.log("candidate", e.candidate);
      websocketRef.current?.send(JSON.stringify({ iceCandidate: e.candidate }));
    }
  }

  function handleTrack(e: RTCTrackEvent) {
    console.log("received tracks");

    if (partnerVideo.current) {
      partnerVideo.current.srcObject = e.streams[0];
    }
  }

  async function handleOffer(offer: RTCSessionDescriptionInit) {
    console.log("received offer. creating answer");

    peerRef.current = createPeer();

    await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));

    userStream.current?.getTracks().forEach((track) => {
      peerRef.current?.addTrack(track, userStream.current as any);
    });

    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);

    websocketRef.current?.send(JSON.stringify({ answer }));
  }

  return (
    <div className="video-wrapper">
      <div>
        <p>me</p>
        <video autoPlay controls muted ref={userVideo}></video>
      </div>
      <div>
        <p>partner</p>
        <video autoPlay controls muted ref={partnerVideo}></video>
      </div>
    </div>
  );
};

export default Room;
