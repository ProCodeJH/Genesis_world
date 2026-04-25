# 🦋 Genesis World — 창조의 세계

> 웹캠 앞에 누구든 손짓 하나로 — 매번 다른 색, 매번 다른 모양, 매번 다른 소리, 매번 다른 행동의 무언가가 — 태어난다. 같은 동작은 두 번 다시 같은 결과를 주지 않는다.

**v0.3** — Atelier (폴더 시각화) → Genesis World (멀티 인물 + 손짓 + 표정 + 절차적 창조)

## 컨셉

| 차원 | 풀 크기 |
|---|---|
| 색 팔레트 | 20 (Studio Ghibli 4 / 한국 4 / Pixar 2 / 자연 3 / 8-bit·데모씬 3 / 사이버 2 / 미술관 2) |
| 모양 | 15 (구·박스·정20면체·토러스·별·정4면체·정12면체·캡슐·토러스매듭·콘·링·결정·스파이크·클러스터·블레이드) |
| 움직임 | 12 (떠있기·자전·궤도·Perlin흐름·맥동·Boids군집·낙하·상승·댄스·진동·폭발·고정) |
| 출생 효과 | 5 (폭발·소환·꽃피기·조립·응축) |
| 사망 효과 | 5 (페이드·파편·씨앗·승천·화석화) |
| **결정론 조합** | **90,000+** × 무한 연속 변수 |

## 인터랙션 (글자 없이도 자명)

| 행동 | 결과 |
|---|---|
| 👌 핀치 (엄지+검지) | 손끝에 무언가 태어남 + 짧은 음 |
| 😮 입 벌리고 핀치 | 큰 창조물 (mouthOpen → 1.0~2.5x scale) |
| 😊 미소 + 핀치 | 따뜻한 색조 우선 (Ghibli/한국/Pixar) |
| 😲 놀람 + 핀치 | 강렬한 색조 우선 (사이버/Plasma/NES) |
| 👏 박수 | 표현 모드 셔플 (스켈레톤 ↔ 점들 ↔ 이중) + 모든 창조물 위로 솟구침 |
| 📂 폴더에 새 파일 | 가장자리에 별 자동 생성 (어제 코드와 융합) |

## 실행

```bash
cd atelier
npm install
npm run dev
```

HUD에서:
1. **트래킹 시작** → 웹캠 권한 → MediaPipe 모델 다운로드 (첫 1회 ~10초)
2. 손 들기 → 스켈레톤이 빛으로 따라옴
3. 핀치 → 무언가 태어남
4. (선택) **감시 시작**으로 폴더 별도 생성

## 아키텍처

```
INPUT                    INTERPRETATION              WORLD            RENDER
chokidar      ─┐         GestureDetector          miniplex ECS       WebcamPlane
MediaPipe Pose ├─► IPC ─► ExpressionDetector ─► persons + ──► R3F ─► PersonSkeletons
MediaPipe Hand ┤         RhythmDetector           creations          Creations (15 instanced)
MediaPipe Face ┘                                                    PostFX (Bloom + CA)
```

## 카탈로그 확장 (자현이 늘릴 곳 ⭐)

```
src/factories/catalog/
├ palettes.ts     ─ 새 미감 추가 → 즉시 풀에 들어감
├ shapes.ts       ─ 새 ShapeKind + Creations.tsx에 instancedMesh 한 줄
├ motions.ts      ─ 새 MotionKind + creationLifecycleSystem case 한 줄
├ births.ts       ─ 새 출생 애니
└ deaths.ts       ─ 새 사망 애니
```

20→50 팔레트, 15→30 모양으로 늘리면 결정론 조합만 2,250,000으로 폭발.

## 4계층 시드 (반-결정론)

```
session seed   → 그날의 큰 분위기 (시작할 때 고정)
person seed    → 사람마다 고유 팔레트 (얼굴 ID 해시)
action seed    → 매 손짓마다 새 변주
time seed      → 같은 손짓도 시간 따라 진화
```

→ "내 거인데 매번 새롭다"의 비밀.

## Phase 로드맵

- [x] **v0.1** Atelier — 폴더 시각화
- [x] **v0.2** Embodiment + 랜덤 Creation Factory
- [x] **v0.3** 카탈로그 폭발 + 표정 + 박수 모드 + 출생/사망 + 폴더 융합
- [ ] **v0.4** Procedural Generation 폭발 (L-System, Boids 깊게, Reaction-Diffusion)
- [ ] **v0.5** 데모씬 + 옛날 미학 (Plasma, ASCII, Pixel, Voronoi 셰이더)
- [ ] **v0.6** Physics + Manipulation (Rapier, 잡기/던지기, 두 사람 융합)
- [ ] **v0.7** Sound 종합 (Tone.js 깊게, 박자 시각화)
- [ ] **v0.8** World/시간 (영속화, 화석화, 환경 진화)
- [ ] **v0.9** AI 종합 (BodyPix, Whisper, Transformers)
- [ ] **v1.0** Multiplayer (WebRTC + Yjs CRDT)

## 기술 스택

- Electron 32 + electron-vite
- React 18 + React Three Fiber + drei
- Three.js + @react-three/postprocessing (Bloom + ChromaticAberration + Vignette)
- miniplex ECS
- MediaPipe Tasks Vision (Pose × 4 + Hand × 8 + Face × 4)
- chokidar + simple-git (폴더 감시)
- Tone.js (절차적 음향)
- chroma-js, simplex-noise, seedrandom

## 라이선스

MIT — 자현 (ProCodeJH)
