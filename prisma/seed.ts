import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Curated Korean dev-content sources. rssUrl is the dedupe key.
const FEEDS = [
  { name: "velog", siteUrl: "https://velog.io", rssUrl: "velog:trending", description: "개발자 블로그 플랫폼, 주간 트렌딩 글" },
  { name: "우아한형제들", siteUrl: "https://techblog.woowahan.com", rssUrl: "https://techblog.woowahan.com/feed/", description: "배달의민족을 만드는 우아한형제들 기술블로그" },
  { name: "카카오", siteUrl: "https://tech.kakao.com", rssUrl: "https://tech.kakao.com/feed/", description: "추천 시스템, 대규모 분산 처리, AI 리서치" },
  { name: "토스", siteUrl: "https://toss.tech", rssUrl: "https://toss.tech/rss.xml", description: "결제·금융 인프라와 프론트엔드 성능을 다루는 토스팀 블로그" },
  { name: "당근", siteUrl: "https://medium.com/daangn", rssUrl: "https://medium.com/feed/daangn", description: "마이크로서비스, 모바일 플랫폼, 데이터" },
  { name: "네이버 D2", siteUrl: "https://d2.naver.com", rssUrl: "https://d2.naver.com/d2.atom", description: "검색 엔진, 컴파일러, 오픈소스 기여" },
  { name: "컬리", siteUrl: "https://helloworld.kurly.com", rssUrl: "https://helloworld.kurly.com/feed.xml", description: "신선식품 커머스의 물류·주문 시스템" },
  { name: "뱅크샐러드", siteUrl: "https://blog.banksalad.com", rssUrl: "https://blog.banksalad.com/rss.xml", description: "마이데이터, 금융 데이터 엔지니어링" },
  { name: "무신사", siteUrl: "https://medium.com/musinsa-tech", rssUrl: "https://medium.com/feed/musinsa-tech", description: "패션 커머스 플랫폼 개발 이야기" },
  { name: "GeekNews", siteUrl: "https://news.hada.io", rssUrl: "https://news.hada.io/rss/news", description: "개발자 뉴스 큐레이션, Show GN" },
];

async function main() {
  for (const f of FEEDS) {
    await prisma.feed.upsert({
      where: { rssUrl: f.rssUrl },
      update: { name: f.name, siteUrl: f.siteUrl, description: f.description },
      create: f,
    });
  }
  console.log(`seeded ${FEEDS.length} feeds`);
}

main().finally(() => prisma.$disconnect());
