import EditorClientWrapper from "@/widgets/pdf-editor/ui/EditorClientWrapper";

export default function EditorPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <EditorClientWrapper />
    </div>
  );
}
