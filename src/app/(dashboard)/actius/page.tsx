'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, AlertTriangle, PawPrint } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { getJSON, postJSON, ApiError } from '@/lib/api';
import { formatEur } from '@/lib/utils';
import { toISODate } from '@/lib/dates';
import { computeActiuInfo } from '@/lib/actiu-alerts';
import {
  optionsFrom,
  estatActiuValues,
  ESTAT_ACTIU_LABELS,
} from '@/lib/validation/enums';
import type { EstatActiu } from '@prisma/client';

interface Habitacio {
  id: string;
  nom: string;
}
interface Prov {
  id: string;
  nom: string;
}
interface Actiu {
  id: string;
  nom: string;
  categoria: string;
  dataCompra: string;
  cost: string | number;
  garantiaFins: string | null;
  estat: EstatActiu;
  habitacio: { nom: string } | null;
}
interface Animal {
  id: string;
  nom: string;
  especie: string;
  gastoTotal: number;
}

export default function ActiusPage() {
  const now = new Date();
  const [actius, setActius] = useState<Actiu[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [habitacions, setHabitacions] = useState<Habitacio[]>([]);
  const [proveidors, setProveidors] = useState<Prov[]>([]);
  const [fHab, setFHab] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [nou, setNou] = useState({
    nom: '',
    categoria: '',
    dataCompra: toISODate(new Date()),
    cost: '',
    proveidorId: '',
    habitacioId: '',
    garantiaFins: '',
    estat: 'NOU',
  });
  const [animalNou, setAnimalNou] = useState({ nom: '', especie: '' });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = fHab ? `?habitacioId=${fHab}` : '';
    const res = await getJSON<{ actius: Actiu[] }>(`/api/actius${q}`);
    setActius(res.actius);
  }, [fHab]);

  useEffect(() => {
    getJSON<{ habitacions: Habitacio[] }>('/api/habitacions').then((r) => setHabitacions(r.habitacions));
    getJSON<{ proveidors: Prov[] }>('/api/proveidors').then((r) => setProveidors(r.proveidors));
    getJSON<{ animals: Animal[] }>('/api/animals').then((r) => setAnimals(r.animals));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nou.nom || !nou.categoria) return;
    setError(null);
    try {
      await postJSON('/api/actius', {
        nom: nou.nom,
        categoria: nou.categoria,
        dataCompra: nou.dataCompra,
        cost: Number(nou.cost || 0),
        proveidorId: nou.proveidorId || undefined,
        habitacioId: nou.habitacioId || undefined,
        garantiaFins: nou.garantiaFins || undefined,
        estat: nou.estat,
      });
      setNou({
        nom: '',
        categoria: '',
        dataCompra: toISODate(new Date()),
        cost: '',
        proveidorId: '',
        habitacioId: '',
        garantiaFins: '',
        estat: 'NOU',
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant l’actiu');
    }
  }

  async function crearAnimal(e: React.FormEvent) {
    e.preventDefault();
    if (!animalNou.nom || !animalNou.especie) return;
    await postJSON('/api/animals', animalNou);
    setAnimalNou({ nom: '', especie: '' });
    getJSON<{ animals: Animal[] }>('/api/animals').then((r) => setAnimals(r.animals));
  }

  const alertes = actius.filter(
    (a) => computeActiuInfo({ dataCompra: new Date(a.dataCompra), garantiaFins: a.garantiaFins ? new Date(a.garantiaFins) : null, estat: a.estat }, now).alerta,
  ).length;

  return (
    <div>
      <PageHeader
        title="Actius"
        subtitle={`${actius.length} actius · ${alertes} amb alerta`}
        actions={
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> Nou actiu
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={crear} className="grid gap-3 sm:grid-cols-3">
              <Field label="Nom" required>
                <Input value={nou.nom} onChange={(e) => setNou({ ...nou, nom: e.target.value })} />
              </Field>
              <Field label="Categoria" required>
                <Input value={nou.categoria} onChange={(e) => setNou({ ...nou, categoria: e.target.value })} />
              </Field>
              <Field label="Cost €">
                <Input type="number" step="0.01" value={nou.cost} onChange={(e) => setNou({ ...nou, cost: e.target.value })} />
              </Field>
              <Field label="Data de compra" required>
                <Input type="date" value={nou.dataCompra} onChange={(e) => setNou({ ...nou, dataCompra: e.target.value })} />
              </Field>
              <Field label="Garantia fins">
                <Input type="date" value={nou.garantiaFins} onChange={(e) => setNou({ ...nou, garantiaFins: e.target.value })} />
              </Field>
              <Field label="Estat">
                <Select value={nou.estat} onChange={(e) => setNou({ ...nou, estat: e.target.value })}>
                  {optionsFrom(estatActiuValues, ESTAT_ACTIU_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Habitació">
                <Select value={nou.habitacioId} onChange={(e) => setNou({ ...nou, habitacioId: e.target.value })}>
                  <option value="">—</option>
                  {habitacions.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nom}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Proveïdor">
                <Select value={nou.proveidorId} onChange={(e) => setNou({ ...nou, proveidorId: e.target.value })}>
                  <option value="">—</option>
                  {proveidors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-3 flex items-center gap-3">
                <Button type="submit">Desar actiu</Button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 max-w-xs">
        <Select value={fHab} onChange={(e) => setFHab(e.target.value)}>
          <option value="">Totes les habitacions</option>
          {habitacions.map((h) => (
            <option key={h.id} value={h.id}>
              Habitació {h.nom}
            </option>
          ))}
        </Select>
      </div>

      {actius.length === 0 ? (
        <EmptyState>Cap actiu.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Nom</Th>
              <Th>Categoria</Th>
              <Th>Hab.</Th>
              <Th>Antiguitat</Th>
              <Th>Estat</Th>
              <Th>Cost</Th>
            </tr>
          </Thead>
          <tbody>
            {actius.map((a) => {
              const info = computeActiuInfo(
                {
                  dataCompra: new Date(a.dataCompra),
                  garantiaFins: a.garantiaFins ? new Date(a.garantiaFins) : null,
                  estat: a.estat,
                },
                now,
              );
              return (
                <Tr key={a.id}>
                  <Td>
                    <Link href={`/actius/${a.id}`} className="font-medium text-slate-900">
                      {a.nom}
                    </Link>
                    {info.alerta && (
                      <Badge tone="warning" className="ml-2">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {info.motiu}
                      </Badge>
                    )}
                  </Td>
                  <Td>{a.categoria}</Td>
                  <Td>{a.habitacio?.nom ?? '—'}</Td>
                  <Td>{info.anysAntiguitat} anys</Td>
                  <Td>
                    <Badge tone={a.estat === 'OBSOLET' ? 'danger' : 'neutral'}>
                      {ESTAT_ACTIU_LABELS[a.estat]}
                    </Badge>
                  </Td>
                  <Td>{formatEur(Number(a.cost))}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* Animals */}
      <Card className="mt-8">
        <CardHeader className="flex items-center gap-2">
          <PawPrint className="h-4 w-4 text-brand-600" />
          <CardTitle>Animals</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {animals.length === 0 && <p className="text-sm text-slate-400">Cap animal.</p>}
          {animals.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">
                {a.nom} <span className="text-slate-400">· {a.especie}</span>
              </span>
              <span className="text-slate-500">Despeses: {formatEur(a.gastoTotal)}</span>
            </div>
          ))}
          <form onSubmit={crearAnimal} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <Field label="Nom">
              <Input value={animalNou.nom} onChange={(e) => setAnimalNou({ ...animalNou, nom: e.target.value })} />
            </Field>
            <Field label="Espècie">
              <Input value={animalNou.especie} onChange={(e) => setAnimalNou({ ...animalNou, especie: e.target.value })} />
            </Field>
            <Button type="submit" size="sm" variant="outline">
              <Plus className="h-4 w-4" /> Afegir animal
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
