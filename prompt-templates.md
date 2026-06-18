# 프롬프트 템플릿

이 아카이브를 운영할 때 쓰는 프롬프트 모음.

## (A) 사이트 빌드 프롬프트

> 빌드 단계 없는 정적 HTML + 바닐라 JS로, 개인 AI 학습 아카이브 사이트를 만들어줘.
> Anthropic 블로그와 Dario Amodei 글을 모아 글마다 ①원문 링크 ②한글 요약 ③뉴스레터형
> 요약을 보여준다. 데이터는 `data/articles.json` 하나로 관리하고, 목록(검색·출처/주제 필터)·
> 상세(탭: 뉴스레터 요약/핵심 정리/원문 인용 + 내 메모 localStorage)·소개 페이지를 해시 라우팅으로
> 구성한다. 차분한 롱폼 독서 톤, 라이트/다크, CSS 변수 토큰, 모바일 우선. 저작권상 원문 전문·전체
> 번역은 게시하지 않고 링크·요약·짧은 인용 중심으로 한다.

## (B) 글 1편 처리 프롬프트 — 새 글이 올라올 때마다

> 아래 URL의 글을 읽고, 내 학습 아카이브 `data/articles.json`에 넣을 JSON 객체 1개를 만들어줘.
>
> URL: `<여기에 anthropic.com 또는 darioamodei.com 글 링크>`
>
> 형식:
> - `id`: 출처+슬러그+연월 (예: anthropic-xxx-2026-06)
> - `source`: "anthropic" | "dario"
> - `title_en`, `title_ko`
> - `url`, `published_date`(YYYY-MM-DD), `added_date`(오늘), `reading_minutes`
> - `tags`: 핵심 주제 3~6개
> - `summary_oneline_ko`: 한 문장
> - `key_points_ko`: 핵심 3개 (각 1~2문장)
> - `summary_newsletter_ko`: 뉴스레터 톤(마크다운). 구성 ‹왜 중요한가 → 핵심 내용 → 내 학습 포인트›, 과장 금지, 600~900자
> - `quote_en`, `quote_ko`: **짧은** 직접 인용 1~2문장 (출처 표기용)
>
> 규칙:
> - 원문에 없는 사실을 지어내지 말 것. 불확실하면 "원문 확인 필요"로 표시.
> - **전문(全文)·전체 번역은 만들지 말 것** (저작권). 요약·핵심·짧은 인용만.
> - 고유명사·모델명·수치는 원문 그대로.
