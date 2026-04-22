# 📚 나의 독서록 프로토타입 설계 제안서

## 1. 프로젝트 개요
- **목적**: 읽은 책을 기록하고, 책 속 메모와 느낀 점을 체계적으로 관리하는 개인 독서 관리 웹앱
- **범위**: 책 등록·조회·수정·삭제, 메모 관리, 이미지 업로드, 검색·필터, 독서 통계
- **기대효과**: 독서 습관 형성, 인상 깊은 구절의 영구 보존, 나만의 독서 이력 아카이브 구축

---

## 2. 핵심 기능 정의

### 2.1 필수 기능 (Phase 1)
- [ ] **책 등록**: 제목, 저자, 읽기 시작일, 완독일 입력
- [ ] **책 표지 이미지**: 파일 직접 업로드 또는 URL 입력 지원
- [ ] **독서 상태**: 읽고 싶음 / 읽는 중 / 완독 선택
- [ ] **별점 평가**: 1~5점 별점 기록
- [ ] **책 속 메모**: 페이지 번호 + 메모 내용, 복수 등록 가능
- [ ] **느낀 점**: 자유 텍스트 에디터
- [ ] **데이터 저장**: LocalStorage 기반 영구 저장

### 2.2 부가 기능 (Phase 2~3)
- [ ] **책 목록 보기**: 카드 그리드 형태의 전체 목록
- [ ] **책 상세 보기**: 등록된 모든 정보 표시
- [ ] **수정 / 삭제**: 기존 책 정보 편집 및 삭제
- [ ] **검색**: 제목 또는 저자명으로 검색
- [ ] **상태 필터**: 전체 / 읽고 싶음 / 읽는 중 / 완독 필터링
- [ ] **독서 통계**: 전체 권수, 완독 권수, 읽는 중 권수 요약

---

## 3. 기술 아키텍처

### 3.1 기술 스택
- **Frontend**: React 18 (Vite), Tailwind CSS (npm)
- **빌드 도구**: Vite (ESM 번들링, 프로덕션 빌드)
- **데이터 저장**: Firebase Firestore (클라우드)
- **인증**: Firebase Authentication (Google 로그인)
- **배포**: Vercel (GitHub 연동, 자동 배포)

### 3.2 시스템 구조
```
src/
└── App.jsx          # 전역 상태 관리, 뷰 라우팅, Firebase 연동
    ├── Header           # 상단 네비게이션, Google 로그인 버튼
    ├── BookList         # 상태별 섹션(읽는 중/완독/읽고 싶음), 검색·필터, 통계 카드
    ├── BookCard         # 개별 도서 미리보기 카드 (상태 배지 포함)
    ├── BookForm         # 도서 등록·수정 폼
    │   └── MemoItem     # 개별 메모 입력 컴포넌트
    ├── BookDetail       # 도서 상세 조회 화면
    └── StarRating       # 별점 입력/표시 컴포넌트
```

### 3.3 데이터 모델
```json
{
  "id": 1713312000000,
  "title": "책 제목",
  "author": "저자명",
  "coverImage": "base64 또는 URL",
  "startDate": "2026-04-01",
  "endDate": "2026-04-17",
  "status": "completed",
  "rating": 4,
  "memos": [
    { "id": 1234, "page": "42", "content": "인상 깊은 구절..." }
  ],
  "feelings": "책을 읽고 느낀 점...",
  "createdAt": 1713312000000
}
```

---

## 4. 개발 계획

### Phase 1: 핵심 기능 구현 ✅ (기간: 1주)
- [x] 프로젝트 구조 설계 및 proposal.md 작성
- [x] 책 등록 폼 (제목, 저자, 날짜, 상태, 별점)
- [x] 책 표지 이미지 업로드 (파일 / URL 이중 지원)
- [x] 책 속 메모 다중 등록 (페이지 + 내용)
- [x] 느낀 점 텍스트 에디터
- [x] LocalStorage 저장 / 불러오기
- [x] 책 목록 카드 그리드 UI

### Phase 2: 조회·편집 기능 ✅
- [x] 책 상세 보기 화면
- [x] 책 수정 기능
- [x] 책 삭제 기능 (확인 다이얼로그)
- [x] 검색 기능 (제목 / 저자)
- [x] 상태별 필터링

### Phase 3: 통계 및 UX 개선 ✅
- [x] 독서 통계 카드 (전체 / 완독 / 읽는 중)
- [x] 빈 상태(Empty State) UI
- [x] 모바일 반응형 최적화
- [x] 애니메이션 및 전환 효과

### Phase 4: 배포 ✅
- [x] index.html 생성 (Vercel 진입점)
- [x] GitHub 저장소 생성 및 push (https://github.com/abenuhappy/reading-journal)
- [x] Vercel 연동 및 배포 (https://reading-journal-psi.vercel.app)

### Phase 5: 클라우드 데이터 저장 ✅
- [x] Firebase 프로젝트 생성 (reading-journal-bd425)
- [x] Google 로그인 연동 (Firebase Authentication)
- [x] Firestore 데이터 저장 (LocalStorage 대체)
- [x] Firebase 승인 도메인에 Vercel URL 등록
- [x] 공개 읽기 / 소유자 전용 편집 모드 분리

### Phase 6: 프로덕션 빌드 환경 구축 ✅
- [x] Vite + React + Tailwind CSS 빌드 파이프라인 도입
- [x] 브라우저 콘솔 경고 제거 (Tailwind CDN, Babel standalone)
- [x] Firebase SDK를 ES 모듈로 직접 import (window._fb 패턴 제거)
- [x] React production 빌드 자동 적용
- [x] vercel.json COOP 헤더 설정 (Firebase 로그인 팝업 에러 수정)

### Phase 7: 디자인 시스템 전면 개편 ✅
- [x] CSS 변수 기반 3가지 테마 (Paper / Library / Minimal) 도입
- [x] Google Fonts 적용 — Noto Serif KR (헤딩) + IBM Plex Sans KR (본문) + IBM Plex Mono (라벨)
- [x] 생성형 책 표지 컴포넌트 — 표지 이미지가 없을 때 제목/저자/색상으로 자동 생성
- [x] 3가지 목록 레이아웃 — 책장(Shelf) / 그리드(Grid) / 리스트(List)
- [x] Tweaks 패널 — 우측 하단 테마·레이아웃 실시간 전환 (localStorage 저장)
- [x] 통계 카드 4종 (Books / Pages / Rating / Reading)
- [x] 메모 인용구 디자인 개선 — 페이지 번호 좌측 세로 + accent 선 블록쿼트
- [x] 상세 화면 진행률 바 (읽는 중 상태)
- [x] 섹션 헤더 타이포그래피 — 한글 타이틀 + 영문 서브타이틀 + 카운터
- [x] 표지 팔레트 8종 + 색상 선택 UI
- [x] 깜빡임 방지 인라인 스크립트 (index.html 테마 사전 적용)

---

## 5. 리스크 및 고려사항
- **이미지 용량**: Base64 인코딩 시 LocalStorage 용량(5MB) 초과 가능 → 이미지 압축 또는 URL 입력 권장 안내
- **데이터 유실**: LocalStorage는 브라우저 초기화 시 삭제 → 향후 JSON 내보내기/가져오기 기능 추가 고려
- **크로스 브라우저**: IE 미지원 (모던 브라우저 Chrome, Safari, Firefox, Edge 대상)

---

## 6. 변경 이력

| 날짜 | 유형 | 변경 내용 | 사유 |
|------|------|-----------|------|
| 2026-04-17 | [PM직접수정] | Phase 1~3 전 기능 구현 완료 (reading_journal.html) | PM이 직접 구현, 사후 반영 |
| 2026-04-17 | [기능추가] | Phase 4 배포 단계 추가 — index.html 생성, GitHub/Vercel 배포 | PM 요청 |
| 2026-04-17 | [기능추가] | GitHub 저장소 생성 완료 (abenuhappy/reading-journal) | 배포 진행 |
| 2026-04-17 | [기능추가] | Vercel 배포 완료 (https://reading-journal-psi.vercel.app) | PM 요청 |
| 2026-04-17 | [기획변경] | 데이터 저장소를 LocalStorage → Firebase Firestore로 전환, Google 로그인 추가 | 멀티 기기 접근 요구 |
| 2026-04-17 | [기획변경] | 공개 읽기 / 소유자 전용 편집 분리 — 비로그인 시 목록·상세 열람 가능, 편집 버튼 숨김 | PM 요청 |
| 2026-04-17 | [내부수정] | 소유자 UID 고정 — 특정 Google 계정만 편집 가능하도록 수정 | 타인 로그인 편집 차단 |
| 2026-04-18 | [기획변경] | Vite 빌드 파이프라인 도입 — CDN 방식에서 npm 빌드 방식으로 전환 | 브라우저 콘솔 경고 제거 |
| 2026-04-18 | [내부수정] | vercel.json 추가 — COOP 헤더를 same-origin-allow-popups로 설정 | 로그인 팝업 Cross-Origin 에러 수정 |
| 2026-04-18 | [내부수정] | vite.config.js server.headers에 COOP same-origin-allow-popups 추가 | 로컬 개발 서버에서도 팝업 에러 재현 방지 |
| 2026-04-18 | [내부수정] | BookCard 이미지 영역 absolute inset-0 구조로 변경 — 이미지 높이 통일 | 표지 비율 불일치 개선 |
| 2026-04-18 | [내부수정] | 상태 배지를 이미지 위 absolute → 카드 정보 영역으로 이동 | 밝은 표지에서 배지 시인성 문제 해소 |
| 2026-04-18 | [내부수정] | 취소 버튼 flex-1 제거 후 텍스트 링크 스타일로 변경 | 주요 액션(수정 완료/저장) 시선 집중 |
| 2026-04-18 | [내부수정] | 검색창 py-3→py-2.5, mx-0.5 추가 — 통계 카드·필터 탭과 여백 리듬 통일 | 검색창 과강조 해소 |
| 2026-04-18 | [내부수정] | 책 목록 기본 정렬 변경 — 읽고 싶음 → 읽는 중 → 완독 → 각 그룹 내 최신 등록순 | PM 요청 |
| 2026-04-18 | [기획변경] | 목록 뷰를 상태별 섹션(읽고 싶음/읽는 중/완독)으로 분리, 완독은 완독일 기준 년도별 그룹핑 추가 | PM 요청 |
| 2026-04-18 | [기획변경] | 섹션 순서 및 필터 탭 순서 변경: 읽는 중 → 완독 → 읽고 싶음, 완독 년도별 그룹핑 제거 | PM 요청 |
| 2026-04-18 | [내부수정] | 상태 배지를 카드 정보 영역 → 표지 이미지 우측 상단(absolute)으로 복원 | PM 요청 |
| 2026-04-20 | [PM직접수정] | GitHub 원격 저장소 업데이트 확인 및 로컬 동기화 (git merge origin/main) | PM 요청 |
| 2026-04-20 | [내부수정] | proposal.md 기술 스택·시스템 구조·다음 단계 섹션을 현재 코드 구조(Vite/Firebase)에 맞게 갱신 | 문서-코드 일치 |
| 2026-04-20 | [기획변경] | Claude Design 핸드오프 기반 전면 디자인 개편 — CSS 변수 테마 시스템(Paper/Library/Minimal), 생성형 책 표지, 3가지 레이아웃(Shelf/Grid/List), Tweaks 패널, 세리프 타이포그래피 도입 | PM 요청 |
| 2026-04-20 | [내부수정] | Btn 컴포넌트에 whitespace-nowrap·shrink-0 추가, padding 소폭 축소 — 모바일에서 "+ 책 추가" 버튼 줄바꿈 수정 | PM 요청 |
| 2026-04-22 | [내부수정] | 날짜 입력 필드(시작일/완독일) 그리드를 grid-cols-1 sm:grid-cols-2로 변경 — iOS Safari에서 두 필드가 겹치는 버그 수정 | PM 요청 |
| 2026-04-22 | [기획변경] | "+ 책 추가" 버튼을 헤더 영역에서 제거하고 하단 우측 고정형 원형 플로팅 버튼(FAB)으로 교체 | PM 요청 |
| 2026-04-22 | [내부수정] | 시작일·완독일 input에 boxSizing: border-box, maxWidth: 100%, min-w-0 추가 — iOS Safari에서 날짜 필드가 그리드를 초과하는 너비 버그 수정 | PM 요청 |
| 2026-04-22 | [내부수정] | 오른쪽 필드 컬럼에 min-w-0 overflow-hidden, 날짜 그리드에 overflow-hidden, 인풋에 WebkitAppearance:none 추가 — iOS 가로/세로 모드 모두에서 날짜 필드 오버플로우 완전 수정 | PM 요청 |

---

## 7. 결론 및 다음 단계
1. Phase 7까지 모든 핵심 기능 + 디자인 시스템 구현 완료 — 프로덕션 서비스 운영 중
2. 사용 피드백 수집 후 추가 기능 우선순위 조정
3. 데이터 백업 기능(JSON export) 필요 여부 확인 후 다음 Phase에 반영
