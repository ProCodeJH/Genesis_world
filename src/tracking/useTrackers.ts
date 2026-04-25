import { useEffect, useRef, useState } from 'react';
import { PoseTracker } from './PoseTracker';
import { HandTracker, isPinching, isOpenHand, isFist, pinchWorld } from './HandTracker';
import { FaceTracker, readFaceState, type FaceState } from './FaceTracker';
import { world, queries, type Entity, type Hand, type PersonMode } from '../world/ecs';
import { composeCreation } from '../factories/randomComposer';
import { playCreationSound, playClapBurst } from '../audio/audioEngine';

const WORLD_WIDTH = 8;
const WORLD_HEIGHT = 4.5;

let videoSingleton: HTMLVideoElement | null = null;
let videoStreamPromise: Promise<HTMLVideoElement> | null = null;

export async function getSharedVideo(): Promise<HTMLVideoElement> {
  if (videoSingleton) return videoSingleton;
  if (videoStreamPromise) return videoStreamPromise;
  videoStreamPromise = (async () => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    videoSingleton = video;
    return video;
  })();
  return videoStreamPromise;
}

interface PersonShell {
  id: string;
  entity: Entity;
  prevPinch: Record<string, boolean>;
  lastClapAt: number;
}

const PERSON_MODES: PersonMode[] = ['skeleton', 'particles', 'dual'];

export function useTrackers(enabled: boolean): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const poseRef = useRef<PoseTracker | null>(null);
  const handRef = useRef<HandTracker | null>(null);
  const faceRef = useRef<FaceTracker | null>(null);
  const personsRef = useRef<Map<number, PersonShell>>(new Map());
  const modeIdxRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const video = await getSharedVideo();
        if (cancelled) return;

        const pose = new PoseTracker();
        const hand = new HandTracker();
        const face = new FaceTracker();
        await Promise.all([pose.init(), hand.init(), face.init()]);
        if (cancelled) { pose.dispose(); hand.dispose(); face.dispose(); return; }
        poseRef.current = pose;
        handRef.current = hand;
        faceRef.current = face;
        setReady(true);

        const loop = (t: number) => {
          if (cancelled) return;
          rafRef.current = requestAnimationFrame(loop);
          tick(video, t, pose, hand, face, personsRef.current, modeIdxRef);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      poseRef.current?.dispose();
      handRef.current?.dispose();
      faceRef.current?.dispose();
      poseRef.current = null;
      handRef.current = null;
      faceRef.current = null;
      for (const shell of personsRef.current.values()) {
        try { world.remove(shell.entity); } catch { /* ignore */ }
      }
      personsRef.current.clear();
      setReady(false);
    };
  }, [enabled]);

  return { ready, error };
}

function tick(
  video: HTMLVideoElement,
  timestampMs: number,
  pose: PoseTracker,
  hand: HandTracker,
  face: FaceTracker,
  shells: Map<number, PersonShell>,
  modeIdxRef: React.MutableRefObject<number>,
): void {
  const poseRes = pose.detect(video, timestampMs);
  const handRes = hand.detect(video, timestampMs);
  const faceRes = face.detect(video, timestampMs);

  if (!poseRes && !handRes && !faceRes) return;

  const detectedIds = new Set<number>();
  const numPersons = poseRes?.landmarks?.length ?? 0;
  const currentMode = PERSON_MODES[modeIdxRef.current % PERSON_MODES.length];

  for (let i = 0; i < numPersons; i++) {
    detectedIds.add(i);
    let shell = shells.get(i);
    if (!shell) {
      const ent: Entity = {
        id: crypto.randomUUID(),
        kind: 'person',
        personId: i,
        pose: { landmarks: [] as never },
        hands: [],
        face: { mouthOpen: 0, smile: 0, surprise: 0 },
        mode: currentMode,
      };
      world.add(ent);
      shell = { id: ent.id, entity: ent, prevPinch: {}, lastClapAt: 0 };
      shells.set(i, shell);
    }
    shell.entity.pose = {
      landmarks: poseRes!.landmarks[i] as never,
      worldLandmarks: poseRes!.worldLandmarks?.[i] as never,
    };
    shell.entity.hands = [];
    shell.entity.mode = currentMode;
  }

  // 표정 매칭 (가장 가까운 사람 1명)
  if (faceRes && faceRes.faceBlendshapes && faceRes.faceBlendshapes.length > 0) {
    for (let i = 0; i < faceRes.faceBlendshapes.length; i++) {
      const fs = readFaceState(faceRes.faceBlendshapes[i]?.categories);
      // 단순화: i번째 face → i번째 사람에게 (정확한 매칭은 향후)
      const shell = shells.get(i);
      if (shell) shell.entity.face = fs;
    }
  }

  // 손 매칭 + 핀치 → 창조
  if (handRes && handRes.landmarks) {
    for (let i = 0; i < handRes.landmarks.length; i++) {
      const handLms = handRes.landmarks[i];
      const handedness = handRes.handednesses?.[i]?.[0]?.categoryName === 'Left' ? 'Left' : 'Right';
      const ownerId = matchHandToPerson(handLms, shells);
      const shell = shells.get(ownerId);
      if (!shell) continue;

      const pinch = isPinching(handLms);
      const open = isOpenHand(handLms);
      const fist = isFist(handLms);
      const pinchKey = `${ownerId}-${handedness}`;
      const wasPinching = shell.prevPinch[pinchKey] ?? false;

      const handObj: Hand = {
        handedness,
        landmarks: handLms,
        isPinching: pinch,
        isOpen: open,
        isFist: fist,
        pinchPosition: pinch ? pinchWorld(handLms, WORLD_WIDTH, WORLD_HEIGHT) : undefined,
      };
      shell.entity.hands!.push(handObj);

      if (pinch && !wasPinching && handObj.pinchPosition) {
        const creation = composeCreation({
          position: handObj.pinchPosition,
          personId: ownerId,
          face: shell.entity.face,
          origin: 'hand',
        });
        world.add(creation);
        if (creation.palette && creation.seed != null) {
          void playCreationSound(creation.palette, creation.seed);
        }
      }
      shell.prevPinch[pinchKey] = pinch;

      // 박수 — 양손 손목 가까움 + 쿨다운 600ms → 모드 셔플
      if (handedness === 'Right' && shell.entity.hands && shell.entity.hands.length >= 2) {
        const left = shell.entity.hands.find((h) => h.handedness === 'Left');
        if (left) {
          const lw = left.landmarks[0];
          const rw = handLms[0];
          const dx = lw.x - rw.x;
          const dy = lw.y - rw.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.08 && Date.now() - shell.lastClapAt > 600) {
            shell.lastClapAt = Date.now();
            handleClap(modeIdxRef, shells);
          }
        }
      }
    }
  }

  // TTL: 사라진 사람 제거
  for (const [id, shell] of [...shells.entries()]) {
    if (!detectedIds.has(id)) {
      try { world.remove(shell.entity); } catch { /* ignore */ }
      shells.delete(id);
    }
  }

  const creations = [...queries.creations];
  const HARD_CAP = 280;
  if (creations.length > HARD_CAP) {
    const overflow = creations.length - HARD_CAP;
    for (let i = 0; i < overflow; i++) {
      try { world.remove(creations[i]); } catch { /* ignore */ }
    }
  }
}

function matchHandToPerson(
  handLms: { x: number; y: number; z: number }[],
  shells: Map<number, PersonShell>,
): number {
  if (shells.size === 1) return [...shells.keys()][0];
  const wrist = handLms[0];
  let best = 0, bestDist = Infinity;
  for (const [id, shell] of shells) {
    const lms = shell.entity.pose?.landmarks as { x: number; y: number }[] | undefined;
    if (!lms || lms.length < 17) continue;
    for (const idx of [15, 16]) {
      const lm = lms[idx];
      if (!lm) continue;
      const dx = lm.x - wrist.x;
      const dy = lm.y - wrist.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = id; }
    }
  }
  return best;
}

function handleClap(modeIdxRef: React.MutableRefObject<number>, shells: Map<number, PersonShell>): void {
  void playClapBurst();
  modeIdxRef.current = (modeIdxRef.current + 1) % PERSON_MODES.length;
  const newMode = PERSON_MODES[modeIdxRef.current];
  for (const shell of shells.values()) {
    shell.entity.mode = newMode;
  }
  for (const c of [...queries.creations]) {
    if (typeof c.scale === 'number') c.scale *= 1.15;
    if (c.velocity) {
      c.velocity[0] += (Math.random() - 0.5) * 0.5;
      c.velocity[1] += 0.3;
      c.velocity[2] += (Math.random() - 0.5) * 0.5;
    }
  }
}

export type { FaceState };
