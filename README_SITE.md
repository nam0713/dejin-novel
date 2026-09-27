# 삼류연정 작품 전용 사이트

빌드 도구 없이 실행되는 정적 작품 사이트입니다.

- 작품 소개: `index.html`, `site.js`
- 별도 본문 리더: `reader.html`, `reader.js`, `novel-content.js`
- 공통 스타일: `site-v3.css`
- 상단 풍경: `대진국/삼류연정/이미지/landscape.png`

`reader.html?chapter=1`은 첫 화를, `reader.html`은 마지막으로 읽던 화를 엽니다. 본문에는 스크롤 등장 효과를 적용하지 않아 긴 화도 즉시 표시됩니다. 이전 버전의 `app.js`, `styles.css`, `site-v3.js`~`site-v5.js`는 현재 페이지에서 사용하지 않습니다.

- 표지 및 인물 삽화: `대진국/삼류연정/이미지/`
- 소설 본문: `대진국/삼류연정/그녀에게는 남편이 있었다.txt`
- 공통 로어북: `대진국/공통 로어북/daejin_in_lore_codex.pdf`

## 주요 기능

- 풍경 이미지와 확대된 표지를 사용하는 반응형 메인 비주얼
- 등장인물 10명 갤러리 및 확대 보기
- 대진국 로어북 PDF 연결
- `novel-content.js`의 화별 본문을 표시하는 독립 웹 리더
- 글자 크기, 다크 리딩 테마, 마지막 읽던 화 저장
- 모바일/태블릿/데스크톱 반응형 레이아웃

GitHub Pages를 `main / (root)` 기준으로 활성화하면 별도 빌드 없이 배포할 수 있습니다.

로컬 확인: `python -m http.server 8765 --bind 127.0.0.1` 실행 후 `http://127.0.0.1:8765/` 접속.
