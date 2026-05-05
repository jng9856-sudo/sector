# 📊 섹터 순환매 모니터

섹터별 상대강도 & 모멘텀을 실시간으로 시각화하는 대시보드.  
**GitHub → Vercel** 연동으로 URL 하나만 북마크하면 어디서든 접속 가능함.

---

## ⚡ 배포 방법 (5단계)

### 1. 이 폴더를 GitHub에 올리기
```
sector-rotation/
├── api/
│   └── prices.js      ← Vercel 서버리스 함수 (Yahoo Finance 데이터)
├── index.html         ← 대시보드 메인 페이지
├── package.json
├── vercel.json
└── README.md
```

```bash
git init
git add .
git commit -m "첫 배포"
git remote add origin https://github.com/your-id/sector-rotation.git
git push -u origin main
```

### 2. Vercel 계정 만들기
https://vercel.com → GitHub 계정으로 로그인

### 3. 새 프로젝트 연결
- Vercel 대시보드 → **Add New Project**
- 방금 만든 `sector-rotation` 저장소 선택
- **Framework Preset**: Other
- **Root Directory**: `/` (기본값)
- **Build Command**: 비워두기 (정적 사이트)
- **Output Directory**: 비워두기
- → **Deploy** 클릭

### 4. 자동 배포 완료
Vercel이 자동으로:
- `package.json` 읽어 `yahoo-finance2` 설치
- `api/prices.js`를 서버리스 함수로 등록
- `index.html`을 정적 호스팅

배포되면 `https://your-project.vercel.app` URL 생성됨

### 5. GitHub push → 자동 재배포
이후로는 코드 수정 후 `git push`만 하면 Vercel이 자동 배포

---

## 🔧 섹터 커스터마이징

`index.html` 상단 `SECTORS` 객체와 `api/prices.js`의 `TICKERS` 배열을 함께 수정.

```javascript
// index.html
const SECTORS = {
  "반도체": { ticker: "SOXX", color: "#42A5F5", order: 1 },
  "팔렌티어": { ticker: "PLTR", color: "#FF6B6B", order: 11 }, // ← 추가
  ...
};

// api/prices.js
const TICKERS = ["SPY", "SOXX", "MU", ..., "PLTR"]; // ← 추가
```

---

## 📐 구조

| 파일 | 역할 |
|---|---|
| `api/prices.js` | Node.js 서버리스 함수. Yahoo Finance에서 가격 데이터 수집 → JSON 반환. Vercel Edge 5분 캐시 적용 |
| `index.html` | 브라우저에서 실행되는 전체 대시보드. Plotly.js로 차트 렌더링 |
| `vercel.json` | 서버리스 함수 타임아웃 30초 설정 |
| `package.json` | `yahoo-finance2` 의존성 |

---

## ❓ 자주 묻는 것

**Q. 무료인가요?**  
Vercel Hobby 플랜 기준 무료. 개인 사용은 충분함.

**Q. 데이터가 느린가요?**  
첫 요청은 ~5-8초 소요. 이후 5분간은 Vercel CDN 캐시에서 즉시 응답.

**Q. 한국 주식도 추가할 수 있나요?**  
Yahoo Finance 티커 형식으로 가능. 예: `005930.KS` (삼성전자), `000660.KS` (SK하이닉스)
