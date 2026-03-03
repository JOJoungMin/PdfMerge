import RotatorClientWrapper from "@/widgets/pdf-rotator/ui/RotatorClientWrapper";

export default function RotatePage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <RotatorClientWrapper />
    </div>
  );
}
