# xoymoron.github.io

Minjun Kim의 개인 정적 사이트. 소개 문구는 **I explore audical noises.**

HTML, CSS, JavaScript로 구성되어 있고, 콘텐츠는 브라우저에서 `content.js`를 읽어 표시한다. 외부 JavaScript 패키지, 데이터베이스, 별도 backend는 없다. 글꼴도 저장소 안의 파일을 사용한다.

## 어디를 수정하면 되나

| 하고 싶은 작업 | 수정할 위치 |
| --- | --- |
| 이름·자기소개 | `content.js` → `profile.name`, `profile.bio` |
| 이메일·Contact 링크 | `content.js` → `profile.email`, `profile.links` |
| 이력 추가·수정 | `content.js` → `experiences` |
| publication 추가·수정 | `content.js` → `publications` |
| 작품·오디오 추가 | `content.js` → `works`, 실제 파일은 `assets/` |
| CV PDF 교체 | `content.js` → `cv`, 실제 PDF는 `assets/` |
| post 작성·수정·삭제 | `content.js` → `posts` |
| News 작성 | `index.html` → `.news-list` |
| About의 Selected Publications 활성화 | `index.html`의 해당 주석 블록 |
| 하단 소셜 아이콘·주소 | `index.html` → `.social-footer` |
| 색·글꼴·크기·간격·모바일 레이아웃 | `styles.css` |
| 메뉴·페이지 구조·기본 검색 설명 | `index.html` |
| 테마 전환·페이지 이동·콘텐츠 표시 방식 | `app.js` |

**소개·이름의 HTML fallback과 하단 아이콘 주소는 `index.html`에도 있다.** 해당 내용을 바꿀 때는 아래의 소개/연락처 안내에 따라 함께 수정한다.

## 레포 구조와 동작

```text
xoymoron.github.io/
├── index.html          페이지 구조, News, 아이콘, 기본 metadata
├── content.js          소개, 이력, publications, works, CV, posts
├── app.js              콘텐츠 표시, 테마, 페이지 이동
├── styles.css          디자인 전체
├── assets/
│   └── fonts/          Archivo 글꼴과 OFL 라이선스
├── scripts/
│   ├── serve.mjs       로컬 미리보기 서버
│   └── build.mjs       구문 확인 후 공개 파일을 dist/에 복사
├── package.json        실행 명령과 Node.js 버전
├── .nojekyll           GitHub Pages에서 정적 파일을 그대로 제공
├── .gitignore          dist/, 로그 등의 추적 제외
├── .git/               Git 내부 이력과 설정
├── README.md           이 사용 설명서
└── dist/               build로 생성되는 복사본
```

`index.html`이 레이아웃을 제공하고, `styles.css`가 모양을 결정한다. `app.js`는 `content.js`의 데이터를 읽어 각 목록을 채우고 선택한 페이지만 보여준다.

메뉴는 `About / Experiences / Publications / Works / CV / Blog / Contact` 순서다. 주소의 `#about`, `#publications`, `#blog/글-slug`로 페이지를 구분하므로 GitHub Pages에서도 각 화면과 글에 직접 연결할 수 있다.

**평소에는 루트의 원본 파일을 수정한다. `dist/`는 직접 편집하지 않는다.** 현재 GitHub Pages 안내는 저장소 루트를 배포하는 방식이다. Node.js는 로컬 미리보기와 build에 사용하며, 방문자의 브라우저에는 필요 없다.

## 로컬에서 보기

Node.js 20 이상이 필요하다. 패키지 설치 없이 레포 폴더에서 실행한다.

```sh
node scripts/serve.mjs
```

[로컬 미리보기](http://127.0.0.1:4173/#about)를 연다. 파일을 저장하고 브라우저를 새로고침하면 반영된다. 자동 새로고침 기능은 없다. 서버를 종료하려면 터미널에서 `Ctrl+C`를 누른다.

| 실행 명령 | npm이 있을 때의 단축 명령 | 역할 |
| --- | --- | --- |
| `node scripts/serve.mjs` | `npm run dev` | 루트의 원본 파일로 미리보기 |
| 아래의 `node --check` 명령 | `npm run check` | 앱과 두 실행 스크립트의 JavaScript 구문 확인 |
| `node scripts/build.mjs` | `npm run build` | 앱 구문과 글꼴을 확인하고 공개 파일을 `dist/`에 복사 |
| `node scripts/serve.mjs --dist` | `npm run preview` | 기존 `dist/`를 미리보기. 먼저 build를 실행해야 함 |

`dev`와 `preview`는 기본적으로 같은 포트 `4173`을 사용한다. 하나를 종료한 뒤 다른 것을 실행한다. 다른 포트가 필요하면 PowerShell에서 다음처럼 실행한다.

```powershell
$env:PORT = '4174'
node scripts/serve.mjs
```

## 콘텐츠를 수정할 때의 공통 규칙

- 데이터는 `content.js` 안의 JavaScript 객체다. 항목 사이의 쉼표와 따옴표를 유지한다.
- 목록은 **입력한 순서**대로 표시된다. 최신 항목을 위에 두고 싶으면 배열 앞에 추가한다.
- 배열이 `[]`이면 해당 페이지에 빈 상태 안내가 표시된다.
- 이미지·PDF·오디오는 `assets/` 아래에 넣고 `assets/cv.pdf` 같은 상대 경로로 연결한다.
- `links`는 `{ label: 'PDF', url: '실제 주소' }` 형식이다. 표시할 링크가 없으면 `[]`로 둔다.
- 문자열 속 작은따옴표는 `\'`로 적거나 문자열 전체를 큰따옴표로 감싼다.
- 아래 예시는 작성 형식이다. 예시 파일 경로를 사용하려면 실제 파일도 그 위치에 넣어야 한다.

### 소개와 연락처

```js
profile: {
  name: 'Minjun Kim',
  bio: [
    'I explore audical noises.',
  ],
  email: 'oxymoron@yonsei.ac.kr',
  links: [
    { label: 'GitHub', text: '@xoymoron', url: 'https://github.com/xoymoron' },
  ],
},
```

`bio`의 문자열 하나가 한 문단이 된다. 문단을 늘리려면 문자열을 추가한다. Contact의 `email`이 비어 있으면 이메일 항목을 표시하지 않는다. `profile.links`에 항목을 추가하면 Contact에 표시된다.

함께 확인할 `index.html` 위치:

- `data-profile="name"`: JavaScript 실행 전 표시할 이름.
- `data-profile="bio"`: JavaScript 실행 전 표시할 소개. `profile.bio`와 같은 내용으로 유지한다.
- `<title>`과 `<meta name="description">`: 기본 페이지 제목과 검색 설명.
- `.social-footer`: 하단의 Mail, GitHub, LinkedIn, Google Scholar 아이콘 주소. Contact 데이터와 자동 동기화되지 않는다. 주소를 바꾸면 `href`와 필요한 `title`, `aria-label`도 함께 수정한다.

### News와 Selected Publications

News는 `index.html`에서 다음 부분을 수정한다. 현재 두 줄은 임시 문구다.

```html
<ul class="news-list">
  <li>여기에 소식을 작성한다.</li>
  <li>다음 소식을 작성한다.</li>
</ul>
```

About 아래의 Selected Publications는 HTML 주석으로 보관되어 있다. 사용하려면 `Selected Publications: leave commented out until ready.`가 있는 블록의 주석을 해제하고 내용을 채운다. Publications 페이지와 자동으로 연결되는 목록은 아니다.

### Publications

`publications` 배열에 다음 형태의 객체를 추가한다.

```js
{
  category: 'International',
  year: '2025',
  title: 'Exploring Pansori Generation with ACE-Step',
  authors: ['Seola Cho', 'Minjun Kim', 'Dasaem Jeong'],
  venue: '26th International Society for Music Information Retrieval (ISMIR) Conference · Daejeon, South Korea',
  note: 'Late Breaking/Demo',
  links: [],
},
```

- `category`: `International`, `Domestic`처럼 분류명을 입력한다. 같은 분류끼리 묶이고, 분류가 처음 등장한 순서대로 표시된다. 분류를 생략하면 제목 없는 그룹에 들어간다.
- `year`, `title`, `venue`: 각각 연도, 제목, 학회·저널 정보를 표시한다.
- `authors`: 실제 저자 순서대로 이름 배열을 입력한다. `profile.name`과 정확히 같은 이름이 굵게 표시된다. 일반 문자열도 표시할 수 있지만 이름 강조는 적용되지 않는다.
- `note`: 발표 형태나 출판 상태. 예를 들어 `Extended abstract · Non-archival · Short Oral`.
- `links`: 실제 공개 주소가 있을 때 PDF, Code, Demo 등을 추가한다.

현재 ISMIR 2025 Late Breaking/Demo와 KSMI 2026 extended abstract가 입력되어 있다. 저자나 발표 정보를 수정할 때는 해당 객체를 수정한다. 삭제하려면 그 객체 전체를 배열에서 제거한다.

### Experiences

`experiences` 배열에 다음 형태로 추가한다.

```js
{
  period: '시작 — 종료',
  role: '역할',
  organization: '소속',
  description: '경험 설명',
  links: [],
},
```

### Works

작품 정보는 `works`, 실제 파일은 `assets/`에 넣는다.

```js
{
  year: '연도',
  title: '작품 제목',
  type: 'Album',
  description: '작품 소개',
  cover: 'assets/works/cover.jpg',
  coverAlt: '커버 이미지 설명',
  audio: 'assets/works/excerpt.mp3',
  links: [],
},
```

`type`에는 Album, Single, DJ set 등 원하는 형식을 적는다. `cover`와 `audio`는 선택 항목이라 생략할 수 있다. 오디오는 자동 재생되지 않고, 다른 페이지로 이동하면 재생이 멈춘다. 외부 서비스의 작품 페이지는 `links`에 연결한다.

### CV

PDF 파일을 넣고 `cv`의 경로와 날짜를 수정한다.

```js
cv: {
  file: 'assets/cv.pdf',
  updated: '2026-09',
},
```

`file`이 비어 있으면 기본 안내가 표시된다. 날짜만 바꾸는 것으로 PDF가 교체되지는 않으므로 실제 파일도 함께 교체한다.

## Post 작성·수정·삭제

### 새 글 작성

1. `content.js`의 `posts: []`를 찾는다.
2. 대괄호 안에 아래 형태의 객체를 추가한다. 새 글을 맨 위에 보이게 하려면 첫 항목으로 넣는다.
3. `slug`, 제목, 날짜, 요약, 본문을 채운다.
4. 저장하고 로컬 미리보기의 Blog에서 확인한다.

```js
posts: [
  {
    slug: 'first-note',
    title: '글 제목',
    date: '2026-09-15',
    summary: '목록에 표시할 짧은 설명',
    body: [
      '첫 번째 문단.',
      { type: 'heading', text: '소제목' },
      '두 번째 문단.',
      { type: 'quote', text: '인용문' },
      { type: 'list', items: ['첫 번째 항목', '두 번째 항목'] },
    ],
    links: [],
  },
],
```

본문은 텍스트와 아래 블록으로 작성한다. **Markdown, HTML, LaTeX를 해석하는 기능은 없다.** 예를 들어 `**bold**`를 쓰면 별표까지 그대로 표시된다.

| 본문 형식 | 표시 결과 |
| --- | --- |
| `'문단 내용'` | 일반 문단 |
| `{ type: 'heading', text: '제목' }` | 소제목 |
| `{ type: 'quote', text: '인용' }` | 인용문 |
| `{ type: 'list', items: ['항목 1', '항목 2'] }` | 글머리표 목록 |
| 글 객체의 `links` | 본문 아래 링크 목록 |

### 글 주소와 수정

위 예시의 주소는 `#blog/first-note`다. GitHub Pages에 올라가면 `https://xoymoron.github.io/#blog/first-note`로 공유할 수 있다.

- `slug`는 글마다 고유하게 지정한다. 영문 소문자·숫자·하이픈 조합이 관리하기 쉽다.
- 제목·날짜·요약·본문은 기존 객체에서 바로 수정한다.
- 이미 공유한 글은 `slug`를 유지하면 같은 주소에서 수정된 내용이 보인다. `slug`를 바꾸면 이전 주소에서는 글을 찾을 수 없다.
- 날짜는 표시용이다. 미래 날짜를 입력해도 예약 발행되지 않는다.

### 글 삭제·발행

글을 삭제하려면 `posts`에서 해당 객체를 제거한다. 별도의 관리자 화면이나 draft/publish 상태는 없다. 배열에 포함된 글은 사이트에 표시된다.

로컬 저장은 내 컴퓨터의 미리보기에 반영된다. GitHub Pages에는 수정한 파일을 commit하고 push한 뒤 배포가 끝나면 반영된다.

## 디자인은 어디서 바꾸나

디자인은 `styles.css`에서 수정한다. 영어 섹션 주석으로 영역을 나눠두었다.

| 바꾸려는 부분 | 찾을 선택자·영역 |
| --- | --- |
| 라이트 모드 색상 | `:root`의 CSS 변수 |
| 다크 모드 색상 | `:root[data-theme="dark"]`의 CSS 변수 |
| 글꼴 | `@font-face`, `--sans`, `--mono` |
| 전체 너비·좌우 여백 | `.site-shell` |
| 메뉴 배치·간격·크기 | `.site-header`, `.site-nav`, `.site-nav a` |
| 본문 위아래 여백 | `main` |
| About 이름 크기 | `.name-title` |
| 소개 문장 크기·줄 간격 | `.about-introduction` |
| News 배치·간격 | `.about-section`, `.news-list` |
| 각 페이지의 큰 제목 | `.page-heading h1` |
| 이력·논문·글 목록의 배치·제목 | `.entry`, `.entry-date`, `.entry h2`, `.entry h3` |
| 논문 분류 제목·분류 사이 간격 | `.publication-group-title`, `.publication-group + .publication-group` |
| 작품 이미지·오디오 | `.work-cover`, `.work-audio` |
| 글 본문·소제목·인용문 | `.article-body`, `.article-heading` |
| Contact | `.contact-row`, `.contact-value` |
| 하단 아이콘 | `.social-footer`, `.social-link` |
| 작은 화면의 배치 | `@media (max-width: ...)` |

주요 색상 변수:

- `--paper`: 배경.
- `--ink`: 기본 글자.
- `--muted`: 보조 글자.
- `--line`: 구분선.
- `--accent`: 강조색.
- `--selection`: 텍스트 선택 배경.

배경색을 바꾸면 브라우저 UI 색상을 맞추기 위해 `index.html`의 `theme-color`와 초기 테마 스크립트, `app.js`의 `setTheme()` 색상도 함께 수정한다.

반응형 기준은 `1150px`, `900px`, `600px`다. 같은 선택자가 아래쪽 `@media`에서 다시 정의되면 해당 화면 너비에서 그 값이 적용된다. 기본 규칙과 모바일 규칙을 함께 확인한다.

## 구조나 동작을 바꾸려면

`app.js`는 다음 순서로 정리되어 있다.

1. `routeNames`: 페이지 ID와 제목.
2. DOM·링크 helper: 텍스트, 링크, 공통 목록 행 생성.
3. `initializeTheme()`, `setTheme()`: 테마 선택과 저장.
4. `renderProfile()` 등 `render...` 함수: 각 콘텐츠 영역 표시.
5. `postBody()`, `renderPost()`: 글 본문과 개별 글 화면.
6. `showRoute()`, `handleNavigation()`: 페이지 이동과 브라우저 뒤로/앞으로 가기.
7. 파일 끝의 초기화 호출.

새 메뉴를 추가하려면 `index.html`의 `.site-nav` 링크와 페이지 `<section>`을 만들고, 같은 ID를 `app.js`의 `routeNames`에 등록한다. 해당 영역에 필요한 콘텐츠와 표시 함수도 함께 추가한다.

## 확인하고 GitHub에 반영하기

레포 폴더에서 다음을 실행한다.

```sh
node --check app.js
node --check content.js
node --check scripts/build.mjs
node --check scripts/serve.mjs
node scripts/build.mjs
```

구문 검사와 build가 성공하면 로컬 미리보기에서 변경한 페이지를 확인한다. 검사 명령은 JavaScript 실행 결과나 화면 배치를 자동으로 검사하지 않으므로, 링크·줄바꿈·모바일 모양은 직접 확인한다.

그다음 변경 파일과 필요한 `assets/` 파일을 확인하고 commit, push한다. `dist/`는 생성 파일이라 Git 추적에서 제외되어 있다. 파일을 삭제한 경우 기존 `dist/`의 복사본은 남을 수 있다. build는 정리 작업 없이 원본을 덮어 복사한다.

GitHub Pages 최초 설정:

- Settings → Pages → Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

이 설정에서는 저장소 루트의 정적 파일이 배포되므로 `dist/`를 올릴 필요가 없다. commit만 하면 로컬에 저장되고, push 후 GitHub Pages 배포가 완료되어야 방문자에게 반영된다.

[GitHub Pages 배포 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 글꼴 라이선스

Archivo는 [Google Fonts](https://github.com/google/fonts/tree/main/ofl/archivo)의 글꼴이다. 라이선스는 `assets/fonts/OFL.txt`에 포함되어 있다.
