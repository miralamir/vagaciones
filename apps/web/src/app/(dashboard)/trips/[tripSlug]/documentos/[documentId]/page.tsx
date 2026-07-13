import { DocumentViewerScreen } from "@/components/domain/DocumentViewerScreen";

export default async function DocumentViewerPage({
  params
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  return <DocumentViewerScreen documentId={documentId} />;
}
