# AI 성장 아카이브

Anthropic 블로그와 [Dario Amodei](https://darioamodei.com/)의 글을 직접 읽고
**원문 링크 · 한글 요약 · 뉴스레터 형태**로 정리하는 개인 학습용 아카이브입니다.

정적 HTML + 바닐라 JS(ES modules)로 만들었고 빌드 단계가 없습니다. `index.html`을 열면 바로 동작합니다.

## 로컬에서 보기

브라우저 보안 정책(fetch) 때문에 파일을 직접 여는 대신 간단한 로컬 서버로 띄웁니다.

```bash
cd growth-ai-archive
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

## 구조

```
growth-ai-archive/
├─ index.html          # 단일 진입점 (해시 라우팅: 목록 / #/article/<id> / #/about)
├─ css/styles.css      # 디자인 토큰 + 라이트/다크
├─ js/app.js           # 라우팅·렌더·검색·필터·내 메모(localStorage)
└─ data/articles.json  # 콘텐츠 (이 파일만 고치면 글이 추가됨)
```

## 새 글 추가하기

`data/articles.json`의 `articles` 배열에 객체 하나를 추가합니다.

| 필드 | 설명 |
|---|---|
| `id` | 고유 식별자 (URL 해시에 쓰임) |
| `source` | `"anthropic"` 또는 `"dario"` |
| `title_ko` / `title_en` | 한글/원문 제목 |
| `url` | **원문 링크 (필수)** |
| `published_date` / `added_date` | `YYYY-MM-DD` |
| `reading_minutes` | 원문 예상 읽기 시간 |
| `tags` | 주제 태그 배열 |
| `summary_oneline_ko` | 한 줄 요약 |
| `key_points_ko` | 핵심 정리 (배열) |
| `summary_newsletter_ko` | 뉴스레터형 요약 (마크다운) |
| `quote_en` / `quote_ko` | **짧은** 직접 인용 1~2문장 |

> 글이 올라올 때마다 위 필드를 채우는 작업은 `prompt-templates.md`의 "(B) 글 1편 처리 프롬프트"를 쓰면 편합니다.

## 저작권 원칙 (중요)

이 사이트는 원문을 **대체하지 않습니다.**

- ✅ 직접 작성한 요약·핵심 정리·논평, 원문 **아웃링크**, 짧은 인용(출처 표기)
- 🚫 원문 전문(全文) 복제, 전체 번역본 공개 — `data/articles.json`에 넣지 마세요
- 전체 번역을 개인적으로 보고 싶으면 `js/app.js`의 `PUBLISH_FULL_TRANSLATION`을 `true`로 두되, **공개 배포 시에는 `false`** 로 유지하세요.
- 권리자(저자/Anthropic) 요청이 있으면 해당 항목을 즉시 내립니다.

원문 저작권은 각 저자와 Anthropic, PBC에 있습니다. 코드 자체는 MIT(LICENSE 참고), 콘텐츠는 위 원칙을 따릅니다.

## 배포 (GitHub Pages)

1. 이 폴더를 **공개(public)** 저장소로 올립니다.
2. 저장소 **Settings → Pages → Source: `main` 브랜치 / `/ (root)`** 선택.
3. 몇 분 뒤 `https://<계정>.github.io/<저장소명>/` 에서 공개됩니다.
