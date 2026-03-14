export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-text-primary">Chat</h1>
      <p className="text-text-secondary text-sm mt-2">
        Chat wordt gebouwd in Phase 9. Channel: {params.id}
      </p>
    </div>
  );
}
