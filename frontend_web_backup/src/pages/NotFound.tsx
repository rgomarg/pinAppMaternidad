import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-nanny-bg text-nanny-text p-6">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-lg text-nanny-muted mb-8">Página no encontrada</p>
      <Link
        to="/"
        className="px-6 py-3 bg-nanny-blue text-white font-semibold rounded-xl"
      >
        Volver a inicio
      </Link>
    </div>
  );
}
