'use client';

import { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { getJSON } from '@/lib/api';

type Row = Record<string, string>;

export default function LlibrePage() {
  const [desde, setDesde] = useState('');
  const [fins, setFins] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);

  const query = () => {
    const p = new URLSearchParams();
    if (desde) p.set('desde', desde);
    if (fins) p.set('fins', fins);
    return p.toString();
  };

  async function veure() {
    setLoading(true);
    try {
      const res = await getJSON<{ rows: Row[] }>(`/api/llibre?${query()}`);
      setRows(res.rows);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const p = new URLSearchParams(query());
    p.set('format', 'csv');
    window.open(`/api/llibre?${p.toString()}`, '_blank');
  }

  return (
    <div>
      <PageHeader
        title="Llibre de registre"
        subtitle="Export del registre de viatgers · conservar 3 anys (§2.4)"
      />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Des de">
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </Field>
          <Field label="Fins a">
            <Input type="date" value={fins} onChange={(e) => setFins(e.target.value)} />
          </Field>
          <Button onClick={veure} disabled={loading} variant="outline">
            <Eye className="h-4 w-4" /> {loading ? 'Carregant…' : 'Veure'}
          </Button>
          <Button onClick={exportCsv}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </CardBody>
      </Card>

      {rows === null ? (
        <EmptyState>Selecciona un rang de dates i prem «Veure».</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>Cap registre en aquest rang.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Contracte</Th>
              <Th>Entrada</Th>
              <Th>Sortida</Th>
              <Th>Nom</Th>
              <Th>Cognoms</Th>
              <Th>Document</Th>
              <Th>Municipi</Th>
            </tr>
          </Thead>
          <tbody>
            {rows.map((r, i) => (
              <Tr key={i}>
                <Td>{r.numContracte}</Td>
                <Td>{r.dataEntrada}</Td>
                <Td>{r.dataSortida}</Td>
                <Td>{r.nom}</Td>
                <Td>
                  {r.cognom1} {r.cognom2}
                </Td>
                <Td>
                  {r.tipusDocument} {r.numDocument}
                </Td>
                <Td>{r.municipi}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
