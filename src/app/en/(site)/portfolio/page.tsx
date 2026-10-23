// src/app/en/(site)/portfolio/page.tsx — 영어 포트폴리오. 본문은 PortfolioPage에 있습니다.
import { PortfolioPage } from '@/components/PortfolioPage';

export const metadata = { title: 'Portfolio' };

export default function EnPortfolio() {
  return <PortfolioPage lang="en" />;
}
