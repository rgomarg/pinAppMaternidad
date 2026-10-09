import { useState } from 'react';
import { User, Plus } from 'lucide-react';

export default function Home() {
  const [activeChild, setActiveChild] = useState('Sofía');

  return (
    <div className="p-6 pb-12 flex flex-col gap-6">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-nanny-muted mb-1">Predicciones e insights</p>
          <h1 className="text-3xl font-semibold text-nanny-text">{activeChild}</h1>
        </div>
        <div className="w-10 h-10 bg-nanny-blue rounded-full flex items-center justify-center text-white font-semibold relative">
          U
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
            <div className="bg-nanny-blue text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              <User size={10} />
            </div>
          </div>
        </div>
      </header>

      {/* Child Selector */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveChild('Sofía')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
            activeChild === 'Sofía'
              ? 'bg-nanny-blue text-white'
              : 'bg-nanny-card text-nanny-text'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-orange-200 overflow-hidden flex items-center justify-center text-xs text-black">
            S
          </div>
          Sofía
        </button>
        <button
          onClick={() => setActiveChild('Lucas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
            activeChild === 'Lucas'
              ? 'bg-nanny-blue text-white'
              : 'bg-nanny-card text-nanny-text'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-green-200 overflow-hidden flex items-center justify-center text-xs text-black">
            L
          </div>
          Lucas
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Peso */}
        <div className="bg-nanny-card p-4 rounded-2xl relative">
          <button className="absolute top-4 right-4 w-6 h-6 bg-blue-100 text-nanny-blue rounded-full flex items-center justify-center">
            <Plus size={16} />
          </button>
          <p className="text-nanny-muted text-sm font-medium mb-2">Peso actual</p>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-semibold">20.6</span>
            <span className="text-nanny-text font-medium">kg</span>
          </div>
          <p className="text-nanny-green text-sm font-medium mb-1">+0.5 kg ult. 3m</p>
          <p className="text-nanny-red text-sm font-medium flex items-center gap-1">
            ↗ 22 kg en Jun 26
          </p>
        </div>

        {/* Altura */}
        <div className="bg-nanny-card p-4 rounded-2xl relative">
          <button className="absolute top-4 right-4 w-6 h-6 bg-blue-100 text-nanny-blue rounded-full flex items-center justify-center">
            <Plus size={16} />
          </button>
          <p className="text-nanny-muted text-sm font-medium mb-2">Altura actual</p>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-semibold">116</span>
            <span className="text-nanny-text font-medium">cm</span>
          </div>
          <p className="text-nanny-green text-sm font-medium mb-1">+2 cm ult. 3m</p>
          <p className="text-nanny-red text-sm font-medium flex items-center gap-1">
            ↗ 122 cm en Jun 26
          </p>
        </div>
      </div>

      {/* Curva de crecimiento (Placeholder) */}
      <div className="bg-nanny-card p-4 rounded-2xl min-h-[250px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">Curva de crecimiento</h2>
          <div className="flex bg-white rounded-full overflow-hidden text-sm">
            <button className="bg-nanny-blue text-white px-3 py-1 font-medium">Peso</button>
            <button className="text-nanny-muted px-3 py-1 font-medium">Altura</button>
          </div>
        </div>
        <div className="flex-1 border-2 border-dashed border-nanny-border rounded-xl flex items-center justify-center text-nanny-muted">
          [Componente de gráfico: Curva de crecimiento]
        </div>
      </div>

      {/* Frecuencia de enfermedades (Placeholder) */}
      <div className="bg-nanny-card p-4 rounded-2xl min-h-[250px] flex flex-col">
        <h2 className="font-semibold text-lg">Frecuencia de enfermedades</h2>
        <p className="text-nanny-muted text-sm mb-4">Episodios registrados por mes</p>
        <div className="flex-1 border-2 border-dashed border-nanny-border rounded-xl flex items-center justify-center text-nanny-muted">
          [Componente de gráfico: Frecuencia de enfermedades]
        </div>
      </div>
    </div>
  );
}
