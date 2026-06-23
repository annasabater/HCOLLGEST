'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, AlertTriangle, PawPrint, Boxes } from 'lucide-react';
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
  midaAnimalValues,
  MIDA_ANIMAL_LABELS,
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
  mida: 'PETIT' | 'MITJA' | 'GRAN' | null;
  gastoTotal: number;
  huesped: { id: string; nom: string; cognom1: string } | null;
}

export default function MascotesPage() {
  const now = new Date();
  const [actius, setActius] = useState<Actiu[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [habitacions, setHabitacions] = useState<Habitacio[]>([]);
  const [proveidors, setProveidors] = useState<Prov[]>([]);
  const [fHab, setFHab] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
  const [animalNou, setAnimalNou] = useState({ nom: '', especie: 'Gos', mida: '' });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = fHab ? `?habitacioId=${fHab}` : '';
    const res = await getJSON<{ actius: Actiu[] }>(`/api/actius${q}`);
    setActius(res.actius);
  }, [fHab]);

  const loadAnimals = useCallback(() => {
    getJSON<{ animals: Animal[] }>('/api/animals').then((r) => setAnimals(r.animals));
  }, []);

  useEffect(() => {
    getJSON<{ habitacions: Habitacio[] }>('/api/habitacions').then((r) => setHabitacions(r.habitacions));
    getJSON<{ proveidors: Prov[] }>('/api/proveidors').then((r) => setProveidors(r.proveidors));
    loadAnimals();
    getJSON<{ user: { role: string } }>('/api/auth/me')
      .then((r) => setIsAdmin(r.user.role === 'ADMIN'))
      .catch(() => setIsAdmin(false));
  }, [loadAnimals]);
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
      setNou({ nom: '', categoria: '', dataCompra: toISODate(new Date()), cost: '', proveidorId: '', habitacioId: '', garantiaFins: '', estat: 'NOU' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant l’actiu');
    }
  }

  async function crearAnimal(e: React.FormEvent) {
    e.preventDefault();
    if (!animalNou.nom || !animalNou.especie) return;
    await postJSON('/api/animals', { ...animalNou, mida: animalNou.mida || undefined });
    setAnimalNou({ nom: '', especie: 'Gos', mida: '' });
    loadAnimals();
  }

  const alertes = actius.filter(
    (a) => computeActiuInfo({ dataCompra: new Date(a.dataCompra), garantiaFins: a.garantiaFins ? new Date(a.garantiaFins) : null, estat: a.estat }, now).alerta,
  ).length;

  return (
    <div>
      <PageHeader title="Mascotes" subtitle={`${animals.length} mascotes · ${actius.length} actius`} />

      {/* Mascotes */}
      <Card className="mb-8">
        <CardHeader className="flex items-center gap-2">
          <PawPrint className="h-4 w-4 text-brand-600" />
          <CardTitle>Mascotes</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {animals.length === 0 && <p className="text-sm text-slate-400">Cap mascota registrada.</p>}
          {animals.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <PawPrint className="h-4 w-4 text-brand-600" />
              <span className="font-medium text-slate-800">{a.nom}</span>
              <span className="text-slate-400">· {a.especie}</span>
              {a.mida && <Badge tone="neutral">{MIDA_ANIMAL_LABELS[a.mida]}</Badge>}
              {a.huesped && (
                <Link href={`/huespedes/${a.huesped.id}`} className="text-xs text-brand-700 hover:underline">
                  {a.huesped.nom} {a.huesped.cognom1}
                </Link>
              )}
              {isAdmin && <span className="ml-auto text-slate-500">Despeses: {formatEur(a.gastoTotal)}</span>}
            </div>
          ))}
          <form onSubmit={crearAnimal} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <Field label="Nom">
              <Input value={animalNou.nom} onChange={(e) => setAnimalNou({ ...animalNou, nom: e.target.value })} />
            </Field>
            <Field label="Espècie">
              <Input value={animalNou.especie} onChange={(e) => setAnimalNou({ ...animalNou, especie: e.target.value })} />
            </Field>
            <Field label="Mida">
              <Select value={animalNou.mida} onChange={(e) => setAnimalNou({ ...animalNou, mida: e.target.value })}>
                <option value="">—</option>
                {midaAnimalValues.map((v) => (
                  <option key={v} value={v}>
                    {MIDA_ANIMAL_LABELS[v]}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" size="sm" variant="outline">
              <Plus className="h-4 w-4" /> Afegir mascota
            </Button>
          </form>
          <p className="text-xs text-slate-400">
            Les mascotes dels hostes es vinculen des de la fitxa de l’hoste o l’estada; aquí surten totes.
          </p>
        </CardBody>
      </Card>

      {/* Actius */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-brand-600" /> Actius {alertes > 0 && `· ${alertes} amb alerta`}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> Nou actiu
          </Button>
        </CardHeader>
        <CardBody>
          {showForm && (
            <form onSubmit={crear} className="mb-6 grid gap-3 sm:grid-cols-3">
              <Field label="Nom" required>
                <Input value={nou.nom} onChange={(e) => setNou({ ...nou, nom: e.target.value })} />
              </Field>
              <Field label="Categoria" required>
                <Input value={nou.categoria} onChange={(e) => setNou({ ...nou, categoria: e.target.value })} />
              </Field>
              {isAdmin && (
                <Field label="Cost €">
                  <Input type="number" step="0.01" value={nou.cost} onChange={(e) => setNou({ ...nou, cost: e.target.value })} />
                </Field>
              )}
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
                  {isAdmin && <Th>Cost</Th>}
                </tr>
              </Thead>
              <tbody>
                {actius.map((a) => {
                  const info = computeActiuInfo(
                    { dataCompra: new Date(a.dataCompra), garantiaFins: a.garantiaFins ? new Date(a.garantiaFins) : null, estat: a.estat },
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
                        <Badge tone={a.estat === 'OBSOLET' ? 'danger' : 'neutral'}>{ESTAT_ACTIU_LABELS[a.estat]}</Badge>
                      </Td>
                      {isAdmin && <Td>{formatEur(Number(a.cost))}</Td>}
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
