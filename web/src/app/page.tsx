import { MainMenuWidget } from '@/widgets/main-menu/ui/MainMenuWidget';
import { HomePageClearEffect } from './HomePageClearEffect';

export default function Home() {
  return (
    <>
      <HomePageClearEffect />
      <div className="flex w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full p-4 sm:p-8 md:p-12">
          <MainMenuWidget />
        </div>
      </div>
    </>
  );
}
