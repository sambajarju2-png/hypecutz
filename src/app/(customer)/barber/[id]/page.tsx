export default function BarberProfilePage({ params }: { params: { id: string } }) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-text-primary">Kapper Profiel</h1>
      <p className="text-text-secondary text-sm mt-2">
        Barber profiel wordt gebouwd in Phase 5. Barber: {params.id}
      </p>
    </div>
  );
}
