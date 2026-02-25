import { MainMenuWidget } from '@/widgets/main-menu/ui/MainMenuWidget';
import { HomePageClearEffect } from './HomePageClearEffect';

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || '';
const bannerUrl = `${assetPrefix}/pdf_merge_banner.png`;

export default function Home() {
  return (
    <>
      <HomePageClearEffect />
      <div className="flex w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <section className="relative w-full h-80 bg-gray-700 text-white flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url('${bannerUrl}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-shadow-lg">
            간편하게 끝내는 PDF의 모든 것
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-200 max-w-2xl mx-auto text-shadow">
            PDF 병합, 분할, 압축, 변환을 위한 가장 쉬운 솔루션
          </p>
        </div>
      </section>
      <div className="w-full p-4 sm:p-8 md:p-12">
        <MainMenuWidget />
      </div>
    </div>
    </>
  );
}
