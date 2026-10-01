# 삼류연정 — 먹그림 티저

가로와 세로를 각각 구성한 40초 수묵 모션 티저입니다.

- 가로: `삼류연정-먹그림-티저-landscape.mp4` · 1920×1080 · 30fps
- 세로: `삼류연정-먹그림-티저-portrait.mp4` · 1080×1920 · 30fps
- 두 영상: H.264, AAC 스테레오 48kHz, 빠른 웹 재생을 위한 faststart
- 로컬 감상: [미리보기](http://127.0.0.1:8765/output/samryu-teaser-v2/watch.html)

## 그림과 움직임

화면에 워터마크·낙관·음악 크레딧을 표시하지 않습니다. 본편 제목과 이야기의 문구만 남겼습니다.

장면·인물·전경·제목 먹 번짐 **12점**을 built-in image_gen으로 새로 그렸습니다. 진소백과 서예린의 기존 이미지는 외형 참고로 사용했습니다. 잔질감과 자글자글한 디테일을 줄이고 검은 먹, 회색 담묵, 밝은 여백으로 명암을 정리했습니다. 붉은 색은 매화와 작은 장식에 사용했습니다. 붉은 태양은 없습니다.

가로와 세로의 청혼·수련 장면은 별도 그림입니다. 인물과 전경을 분리하고 먹이 번지는 전환, 깊이에 따른 카메라 이동, 매화잎과 안개의 움직임을 합성했습니다. 인물이 실제 연기하는 완전한 3D/프레임별 캐릭터 애니메이션이 아니라, 새로 그린 그림을 층으로 구성한 수묵 모션 영상입니다.

- 생성한 원본: `art/`
- 생성 모드·실제 프롬프트: `source/art-prompts.json`
- 생성 원본과 저장 경로 대응: `source/art-manifest.json`
- 장면 구성: `source/film-plan.json`
- 연구 자료: [REFERENCES.md](REFERENCES.md)
- 검증 결과: `verification.json`

기존 첫 편집본은 `../samryu-teaser/`에 보관했습니다. 사이트의 본문과 디자인은 이 작업에서 변경하지 않았습니다.

## 음악 출처

**“River Flute” — Kevin MacLeod (incompetech.com)**

- [원곡](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1900005)
- [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)
- 수정: 40초 발췌, 음량 곡선과 페이드, 새로 만든 타악·공명음·먹 전환 효과음 추가, 영상용 음량 정규화
- 출처는 이 문서와 각 MP4의 comment 메타데이터에 포함했습니다.

참고 영상의 영상·음원은 결과물에 사용하지 않았습니다.
