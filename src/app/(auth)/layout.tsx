export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-background px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
