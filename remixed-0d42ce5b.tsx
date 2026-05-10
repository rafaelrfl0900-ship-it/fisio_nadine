import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Users, Wallet, Home, Plus, X, Check,
  Clock, Phone, FileText, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, Trash2, Edit3,
  Heart, Activity, TrendingUp, ArrowLeft, DollarSign,
  Repeat, Stethoscope, Flower2
} from 'lucide-react';

// ============== UTILS ==============
const BRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const newId = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isoFromDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateFromISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDateBR = (iso) => { const d = dateFromISO(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
const fmtDateLong = (iso) => {
  const d = dateFromISO(iso);
  const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`;
};
const dayShort = (iso) => { const d = dateFromISO(iso); return ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][d.getDay()]; };
const monthName = (m) => ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m];

const addDays = (iso, n) => { const d = dateFromISO(iso); d.setDate(d.getDate() + n); return isoFromDate(d); };
const startOfWeek = (iso) => { const d = dateFromISO(iso); const day = d.getDay(); d.setDate(d.getDate() - day); return isoFromDate(d); };

// ============== STORAGE ==============
const loadList = async (key) => {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : [];
  } catch { return []; }
};
const saveList = async (key, list) => {
  try { await window.storage.set(key, JSON.stringify(list)); } catch (e) { console.error('storage error', e); }
};

// ============== APP ==============
export default function App() {
  const [tab, setTab] = useState('today');
  const [patients, setPatients] = useState([]);
  const [appts, setAppts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null); // { type, data }
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    (async () => {
      const [p, a, pay] = await Promise.all([loadList('patients'), loadList('appts'), loadList('payments')]);
      setPatients(p); setAppts(a); setPayments(pay); setLoaded(true);
    })();
  }, []);

  const persist = {
    patients: (next) => { setPatients(next); saveList('patients', next); },
    appts: (next) => { setAppts(next); saveList('appts', next); },
    payments: (next) => { setPayments(next); saveList('payments', next); },
  };

  const actions = {
    addPatient: (p) => persist.patients([...patients, { ...p, id: newId('p'), createdAt: Date.now() }]),
    updatePatient: (id, upd) => persist.patients(patients.map(p => p.id === id ? { ...p, ...upd } : p)),
    deletePatient: (id) => {
      persist.patients(patients.filter(p => p.id !== id));
      persist.appts(appts.filter(a => a.patientId !== id));
      persist.payments(payments.filter(p => p.patientId !== id));
    },
    addAppt: (data) => {
      const items = [];
      const base = { ...data, id: newId('a'), status: 'scheduled' };
      items.push(base);
      if (data.recurWeeks && data.recurWeeks > 0) {
        for (let i = 1; i <= data.recurWeeks; i++) {
          items.push({ ...base, id: newId('a'), date: addDays(data.date, i * 7) });
        }
      }
      persist.appts([...appts, ...items]);
    },
    updateAppt: (id, upd) => persist.appts(appts.map(a => a.id === id ? { ...a, ...upd } : a)),
    deleteAppt: (id) => persist.appts(appts.filter(a => a.id !== id)),
    addPayment: (data) => persist.payments([...payments, { ...data, id: newId('pay') }]),
    deletePayment: (id) => persist.payments(payments.filter(p => p.id !== id)),
  };

  if (!loaded) {
    return (
      <div style={styles.loading}>
        <Flower2 size={28} color="#2D4A3E" />
      </div>
    );
  }

  const showPatientDetail = (id) => { setSelectedPatient(id); setTab('patients'); };

  return (
    <div style={styles.app}>
      <style>{globalCss}</style>

      <div style={styles.viewport}>
        {tab === 'today' && (
          <TodayView
            patients={patients} appts={appts}
            onComplete={(id) => actions.updateAppt(id, { status: 'completed' })}
            onCancel={(id) => actions.updateAppt(id, { status: 'cancelled' })}
            onUndo={(id) => actions.updateAppt(id, { status: 'scheduled' })}
            onPatient={showPatientDetail}
            onAddAppt={() => setModal({ type: 'appt' })}
          />
        )}
        {tab === 'agenda' && (
          <AgendaView
            patients={patients} appts={appts}
            onApptClick={(a) => setModal({ type: 'apptDetail', data: a })}
            onPatient={showPatientDetail}
          />
        )}
        {tab === 'patients' && (
          selectedPatient
            ? <PatientDetail
                patient={patients.find(p => p.id === selectedPatient)}
                appts={appts.filter(a => a.patientId === selectedPatient)}
                payments={payments.filter(p => p.patientId === selectedPatient)}
                onBack={() => setSelectedPatient(null)}
                onEdit={() => setModal({ type: 'editPatient', data: patients.find(p => p.id === selectedPatient) })}
                onAddPayment={() => setModal({ type: 'payment', data: { patientId: selectedPatient } })}
                onAddAppt={() => setModal({ type: 'appt', data: { patientId: selectedPatient } })}
                onApptAction={(a, action) => {
                  if (action === 'complete') actions.updateAppt(a.id, { status: 'completed' });
                  if (action === 'cancel') actions.updateAppt(a.id, { status: 'cancelled' });
                  if (action === 'undo') actions.updateAppt(a.id, { status: 'scheduled' });
                  if (action === 'delete') actions.deleteAppt(a.id);
                }}
                onDeletePayment={actions.deletePayment}
                onDelete={() => {
                  if (confirm('Excluir paciente e todos os seus dados?')) {
                    actions.deletePatient(selectedPatient);
                    setSelectedPatient(null);
                  }
                }}
              />
            : <PatientsList
                patients={patients} appts={appts} payments={payments}
                onSelect={(id) => setSelectedPatient(id)}
                onAdd={() => setModal({ type: 'patient' })}
              />
        )}
        {tab === 'finance' && (
          <FinanceView
            patients={patients} appts={appts} payments={payments}
            onPatient={showPatientDetail}
          />
        )}
      </div>

      {!selectedPatient && (
        <nav style={styles.tabbar}>
          <TabButton icon={Home} label="Hoje" active={tab === 'today'} onClick={() => setTab('today')} />
          <TabButton icon={Calendar} label="Agenda" active={tab === 'agenda'} onClick={() => setTab('agenda')} />
          <TabButton icon={Users} label="Pacientes" active={tab === 'patients'} onClick={() => setTab('patients')} />
          <TabButton icon={Wallet} label="Financeiro" active={tab === 'finance'} onClick={() => setTab('finance')} />
        </nav>
      )}

      {modal?.type === 'patient' && (
        <PatientForm onClose={() => setModal(null)} onSubmit={(d) => { actions.addPatient(d); setModal(null); }} />
      )}
      {modal?.type === 'editPatient' && (
        <PatientForm patient={modal.data} onClose={() => setModal(null)} onSubmit={(d) => { actions.updatePatient(modal.data.id, d); setModal(null); }} />
      )}
      {modal?.type === 'appt' && (
        <ApptForm patients={patients} initial={modal.data} onClose={() => setModal(null)} onSubmit={(d) => { actions.addAppt(d); setModal(null); }} />
      )}
      {modal?.type === 'apptDetail' && (
        <ApptDetailModal
          appt={modal.data}
          patient={patients.find(p => p.id === modal.data.patientId)}
          onClose={() => setModal(null)}
          onAction={(action) => {
            if (action === 'complete') actions.updateAppt(modal.data.id, { status: 'completed' });
            if (action === 'cancel') actions.updateAppt(modal.data.id, { status: 'cancelled' });
            if (action === 'undo') actions.updateAppt(modal.data.id, { status: 'scheduled' });
            if (action === 'delete') actions.deleteAppt(modal.data.id);
            setModal(null);
          }}
          onPatient={() => { showPatientDetail(modal.data.patientId); setModal(null); }}
        />
      )}
      {modal?.type === 'payment' && (
        <PaymentForm patients={patients} initial={modal.data} onClose={() => setModal(null)} onSubmit={(d) => { actions.addPayment(d); setModal(null); }} />
      )}
    </div>
  );
}

// ============== TODAY VIEW ==============
function TodayView({ patients, appts, onComplete, onCancel, onUndo, onPatient, onAddAppt }) {
  const today = todayISO();
  const todayAppts = appts
    .filter(a => a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const completed = todayAppts.filter(a => a.status === 'completed').length;
  const total = todayAppts.length;

  return (
    <div style={styles.view}>
      <header style={styles.header}>
        <div style={styles.headerSubtle}>{fmtDateLong(today)}</div>
        <h1 style={styles.headerTitle}>Hoje</h1>
        {total > 0 && (
          <div style={styles.headerStat}>
            {completed} de {total} {total === 1 ? 'atendimento concluído' : 'atendimentos concluídos'}
          </div>
        )}
      </header>

      <div style={styles.content}>
        {todayAppts.length === 0 ? (
          <EmptyState
            icon={Flower2}
            title="Dia livre"
            text="Sem atendimentos programados para hoje."
            actionLabel="Agendar"
            onAction={onAddAppt}
          />
        ) : (
          <div style={styles.list}>
            {todayAppts.map(a => {
              const patient = patients.find(p => p.id === a.patientId);
              return (
                <ApptCard
                  key={a.id} appt={a} patient={patient}
                  onComplete={() => onComplete(a.id)}
                  onCancel={() => onCancel(a.id)}
                  onUndo={() => onUndo(a.id)}
                  onPatient={() => onPatient(a.patientId)}
                />
              );
            })}
          </div>
        )}
      </div>

      <FAB onClick={onAddAppt} />
    </div>
  );
}

function ApptCard({ appt, patient, onComplete, onCancel, onUndo, onPatient }) {
  if (!patient) return null;
  const isDone = appt.status === 'completed';
  const isCancel = appt.status === 'cancelled';
  const cardStyle = {
    ...styles.apptCard,
    ...(isDone ? styles.apptCardDone : {}),
    ...(isCancel ? styles.apptCardCancel : {}),
  };
  return (
    <div style={cardStyle}>
      <div style={styles.apptTime}>
        <div style={styles.apptTimeBig}>{appt.time}</div>
        <div style={styles.apptTimeDur}>{appt.duration}min</div>
      </div>
      <div style={styles.apptBody}>
        <button onClick={onPatient} style={styles.apptName}>
          {patient.name}
        </button>
        <div style={styles.apptMeta}>
          {patient.type === 'pilates' ? <Flower2 size={12} /> : <Stethoscope size={12} />}
          <span>{patient.type === 'pilates' ? 'Pilates' : 'Homecare'}</span>
          {appt.notes && <><span style={styles.dot}>·</span><span style={styles.apptNote}>{appt.notes}</span></>}
        </div>
        {(isDone || isCancel) && (
          <div style={{ ...styles.statusPill, ...(isDone ? styles.pillDone : styles.pillCancel) }}>
            {isDone ? 'Concluído' : 'Cancelado'}
          </div>
        )}
      </div>
      <div style={styles.apptActions}>
        {!isDone && !isCancel && (
          <>
            <button style={styles.iconBtnDone} onClick={onComplete} aria-label="Concluir">
              <Check size={18} />
            </button>
            <button style={styles.iconBtnCancel} onClick={onCancel} aria-label="Cancelar">
              <X size={18} />
            </button>
          </>
        )}
        {(isDone || isCancel) && (
          <button style={styles.iconBtnUndo} onClick={onUndo} aria-label="Desfazer">
            <Repeat size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============== AGENDA VIEW ==============
function AgendaView({ patients, appts, onApptClick, onPatient }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(todayISO()));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = todayISO();

  const wkEnd = days[6];
  const sd = dateFromISO(weekStart);
  const ed = dateFromISO(wkEnd);
  const rangeLabel = sd.getMonth() === ed.getMonth()
    ? `${sd.getDate()}–${ed.getDate()} de ${monthName(sd.getMonth())}`
    : `${sd.getDate()} ${monthName(sd.getMonth()).slice(0, 3)} – ${ed.getDate()} ${monthName(ed.getMonth()).slice(0, 3)}`;

  return (
    <div style={styles.view}>
      <header style={styles.header}>
        <div style={styles.headerSubtle}>{sd.getFullYear()}</div>
        <h1 style={styles.headerTitle}>Agenda</h1>
        <div style={styles.weekNav}>
          <button style={styles.weekNavBtn} onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft size={18} />
          </button>
          <div style={styles.weekRange}>{rangeLabel}</div>
          <button style={styles.weekNavBtn} onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight size={18} />
          </button>
        </div>
        {weekStart !== startOfWeek(today) && (
          <button style={styles.todayBtn} onClick={() => setWeekStart(startOfWeek(today))}>
            Voltar para hoje
          </button>
        )}
      </header>

      <div style={styles.content}>
        {days.map(d => {
          const dayAppts = appts.filter(a => a.date === d).sort((a, b) => a.time.localeCompare(b.time));
          const isToday = d === today;
          const dt = dateFromISO(d);
          return (
            <div key={d} style={styles.dayBlock}>
              <div style={{ ...styles.dayHeader, ...(isToday ? styles.dayHeaderToday : {}) }}>
                <div style={styles.dayHeaderLeft}>
                  <div style={styles.dayName}>{dayShort(d)}</div>
                  <div style={styles.dayNum}>{dt.getDate()}</div>
                </div>
                {isToday && <div style={styles.todayBadge}>HOJE</div>}
              </div>
              {dayAppts.length === 0 ? (
                <div style={styles.emptyDay}>—</div>
              ) : (
                <div style={styles.dayList}>
                  {dayAppts.map(a => {
                    const p = patients.find(pp => pp.id === a.patientId);
                    if (!p) return null;
                    return (
                      <button key={a.id} style={styles.weekAppt} onClick={() => onApptClick(a)}>
                        <div style={styles.weekApptTime}>{a.time}</div>
                        <div style={styles.weekApptInfo}>
                          <div style={styles.weekApptName}>{p.name}</div>
                          <div style={styles.weekApptType}>
                            {p.type === 'pilates' ? 'Pilates' : 'Homecare'}
                          </div>
                        </div>
                        {a.status === 'completed' && <CheckCircle2 size={14} color="#557A5E" />}
                        {a.status === 'cancelled' && <XCircle size={14} color="#A04444" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============== PATIENTS LIST ==============
function PatientsList({ patients, appts, payments, onSelect, onAdd }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = patients
    .filter(p => filter === 'all' || p.type === filter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const computeBalance = (pId) => {
    const p = patients.find(pp => pp.id === pId);
    if (!p?.sessionPrice) return null;
    const completed = appts.filter(a => a.patientId === pId && a.status === 'completed').length;
    const paid = payments.filter(pay => pay.patientId === pId).reduce((s, x) => s + Number(x.amount), 0);
    return completed * Number(p.sessionPrice) - paid;
  };

  return (
    <div style={styles.view}>
      <header style={styles.header}>
        <div style={styles.headerSubtle}>{patients.length} {patients.length === 1 ? 'cadastrado' : 'cadastrados'}</div>
        <h1 style={styles.headerTitle}>Pacientes</h1>
        <input
          style={styles.search}
          placeholder="Buscar por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={styles.filterRow}>
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Todos</FilterChip>
          <FilterChip active={filter === 'pilates'} onClick={() => setFilter('pilates')}>
            <Flower2 size={12} /> Pilates
          </FilterChip>
          <FilterChip active={filter === 'homecare'} onClick={() => setFilter('homecare')}>
            <Stethoscope size={12} /> Homecare
          </FilterChip>
        </div>
      </header>

      <div style={styles.content}>
        {filtered.length === 0 ? (
          patients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Comece pelos pacientes"
              text="Cadastre seus alunos de Pilates e pacientes homecare para depois agendar atendimentos."
              actionLabel="Cadastrar paciente"
              onAction={onAdd}
            />
          ) : (
            <div style={styles.emptyText}>Nenhum paciente encontrado.</div>
          )
        ) : (
          <div style={styles.list}>
            {filtered.map(p => {
              const balance = computeBalance(p.id);
              return (
                <button key={p.id} style={styles.patientCard} onClick={() => onSelect(p.id)}>
                  <div style={{ ...styles.avatar, ...(p.type === 'pilates' ? styles.avatarPilates : styles.avatarHomecare) }}>
                    {p.type === 'pilates' ? <Flower2 size={18} /> : <Stethoscope size={18} />}
                  </div>
                  <div style={styles.patientInfo}>
                    <div style={styles.patientName}>{p.name}</div>
                    <div style={styles.patientMeta}>
                      <span>{p.type === 'pilates' ? 'Pilates' : 'Homecare'}</span>
                      {p.sessionPrice && <><span style={styles.dot}>·</span><span>{BRL(p.sessionPrice)}/sessão</span></>}
                    </div>
                  </div>
                  {balance !== null && balance > 0 && (
                    <div style={styles.balanceTag}>{BRL(balance)}</div>
                  )}
                  <ChevronRight size={16} color="#9A8E7E" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <FAB onClick={onAdd} />
    </div>
  );
}

// ============== PATIENT DETAIL ==============
function PatientDetail({ patient, appts, payments, onBack, onEdit, onAddPayment, onAddAppt, onApptAction, onDeletePayment, onDelete }) {
  const [tab, setTab] = useState('upcoming');
  if (!patient) return null;

  const sorted = [...appts].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const upcoming = sorted.filter(a => a.date >= todayISO() && a.status === 'scheduled').reverse();
  const history = sorted.filter(a => a.date < todayISO() || a.status !== 'scheduled');
  const completed = appts.filter(a => a.status === 'completed').length;
  const totalDue = patient.sessionPrice ? completed * Number(patient.sessionPrice) : 0;
  const totalPaid = payments.reduce((s, x) => s + Number(x.amount), 0);
  const balance = totalDue - totalPaid;

  return (
    <div style={styles.view}>
      <header style={{ ...styles.header, paddingTop: '12px' }}>
        <button style={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={18} /> <span>Pacientes</span>
        </button>
        <div style={styles.detailHead}>
          <div style={{ ...styles.avatarLg, ...(patient.type === 'pilates' ? styles.avatarPilates : styles.avatarHomecare) }}>
            {patient.type === 'pilates' ? <Flower2 size={26} /> : <Stethoscope size={26} />}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={styles.detailName}>{patient.name}</h1>
            <div style={styles.detailType}>{patient.type === 'pilates' ? 'Aluna de Pilates' : 'Paciente Homecare'}</div>
          </div>
          <button style={styles.editBtn} onClick={onEdit} aria-label="Editar"><Edit3 size={16} /></button>
        </div>

        {(patient.phone || patient.notes) && (
          <div style={styles.detailInfo}>
            {patient.phone && (
              <a href={`tel:${patient.phone.replace(/\D/g, '')}`} style={styles.infoRow}>
                <Phone size={14} /> {patient.phone}
              </a>
            )}
            {patient.notes && (
              <div style={styles.infoRow}><FileText size={14} /> <span>{patient.notes}</span></div>
            )}
          </div>
        )}

        {patient.sessionPrice ? (
          <div style={styles.balanceCard}>
            <div style={styles.balanceRow}>
              <div>
                <div style={styles.balanceLabel}>Saldo a receber</div>
                <div style={{ ...styles.balanceValue, color: balance > 0 ? '#B95F3D' : '#557A5E' }}>{BRL(balance)}</div>
              </div>
              <button style={styles.addPayBtn} onClick={onAddPayment}>
                <Plus size={14} /> Pagamento
              </button>
            </div>
            <div style={styles.balanceMini}>
              <div><span style={styles.balanceMiniLabel}>Sessões</span> <strong>{completed}</strong></div>
              <div><span style={styles.balanceMiniLabel}>Faturado</span> <strong>{BRL(totalDue)}</strong></div>
              <div><span style={styles.balanceMiniLabel}>Recebido</span> <strong>{BRL(totalPaid)}</strong></div>
            </div>
          </div>
        ) : (
          <button style={styles.addPriceBtn} onClick={onEdit}>
            <DollarSign size={14} /> Definir valor por sessão
          </button>
        )}
      </header>

      <div style={styles.tabsRow}>
        <button style={tab === 'upcoming' ? styles.subtabActive : styles.subtab} onClick={() => setTab('upcoming')}>
          Próximas ({upcoming.length})
        </button>
        <button style={tab === 'history' ? styles.subtabActive : styles.subtab} onClick={() => setTab('history')}>
          Histórico ({history.length})
        </button>
        <button style={tab === 'payments' ? styles.subtabActive : styles.subtab} onClick={() => setTab('payments')}>
          Pagamentos ({payments.length})
        </button>
      </div>

      <div style={styles.content}>
        {tab === 'upcoming' && (
          upcoming.length === 0
            ? <div style={styles.emptyText}>Sem atendimentos agendados.</div>
            : <div style={styles.list}>
                {upcoming.map(a => <DetailApptRow key={a.id} appt={a} onAction={(act) => onApptAction(a, act)} />)}
              </div>
        )}
        {tab === 'history' && (
          history.length === 0
            ? <div style={styles.emptyText}>Sem histórico ainda.</div>
            : <div style={styles.list}>
                {history.map(a => <DetailApptRow key={a.id} appt={a} onAction={(act) => onApptAction(a, act)} />)}
              </div>
        )}
        {tab === 'payments' && (
          payments.length === 0
            ? <div style={styles.emptyText}>Nenhum pagamento registrado.</div>
            : <div style={styles.list}>
                {[...payments].sort((a, b) => b.date.localeCompare(a.date)).map(pay => (
                  <div key={pay.id} style={styles.paymentRow}>
                    <div>
                      <div style={styles.paymentAmount}>{BRL(pay.amount)}</div>
                      <div style={styles.paymentMeta}>
                        {fmtDateBR(pay.date)} · {pay.method || 'Pagamento'}
                        {pay.notes && ` · ${pay.notes}`}
                      </div>
                    </div>
                    <button style={styles.delBtnSm} onClick={() => { if (confirm('Excluir pagamento?')) onDeletePayment(pay.id); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
        )}

        <button style={styles.dangerBtn} onClick={onDelete}>
          <Trash2 size={14} /> Excluir paciente
        </button>
      </div>

      <FAB onClick={onAddAppt} />
    </div>
  );
}

function DetailApptRow({ appt, onAction }) {
  const isDone = appt.status === 'completed';
  const isCancel = appt.status === 'cancelled';
  return (
    <div style={styles.detailApptRow}>
      <div style={styles.detailApptDate}>
        <div style={styles.detailApptDay}>{dayShort(appt.date)}</div>
        <div style={styles.detailApptDayNum}>{dateFromISO(appt.date).getDate()}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={styles.detailApptTime}>{appt.time} · {appt.duration}min</div>
        {appt.notes && <div style={styles.detailApptNotes}>{appt.notes}</div>}
        {(isDone || isCancel) && (
          <div style={{ ...styles.statusPill, ...(isDone ? styles.pillDone : styles.pillCancel) }}>
            {isDone ? 'Concluído' : 'Cancelado'}
          </div>
        )}
      </div>
      <div style={styles.apptActions}>
        {!isDone && !isCancel ? (
          <>
            <button style={styles.iconBtnDone} onClick={() => onAction('complete')}><Check size={16} /></button>
            <button style={styles.iconBtnCancel} onClick={() => onAction('cancel')}><X size={16} /></button>
          </>
        ) : (
          <>
            <button style={styles.iconBtnUndo} onClick={() => onAction('undo')}><Repeat size={14} /></button>
            <button style={styles.delBtnSm} onClick={() => { if (confirm('Excluir este agendamento?')) onAction('delete'); }}>
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============== FINANCE VIEW ==============
function FinanceView({ patients, appts, payments, onPatient }) {
  const today = dateFromISO(todayISO());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthAppts = appts.filter(a => {
    const d = dateFromISO(a.date);
    return d.getFullYear() === year && d.getMonth() === month && a.status === 'completed';
  });
  const monthPayments = payments.filter(p => {
    const d = dateFromISO(p.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const computeRevenue = (apList) => apList.reduce((s, a) => {
    const p = patients.find(pp => pp.id === a.patientId);
    return s + (Number(p?.sessionPrice) || 0);
  }, 0);

  const monthRevenue = computeRevenue(monthAppts);
  const monthReceived = monthPayments.reduce((s, p) => s + Number(p.amount), 0);

  // Outstanding balances per patient (only those with sessionPrice and balance > 0)
  const outstanding = patients
    .filter(p => p.sessionPrice)
    .map(p => {
      const completed = appts.filter(a => a.patientId === p.id && a.status === 'completed').length;
      const paid = payments.filter(pay => pay.patientId === p.id).reduce((s, x) => s + Number(x.amount), 0);
      const balance = completed * Number(p.sessionPrice) - paid;
      return { patient: p, balance, completed };
    })
    .filter(x => x.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const totalOutstanding = outstanding.reduce((s, x) => s + x.balance, 0);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  };

  return (
    <div style={styles.view}>
      <header style={styles.header}>
        <div style={styles.headerSubtle}>Controle financeiro</div>
        <h1 style={styles.headerTitle}>Financeiro</h1>
        <div style={styles.weekNav}>
          <button style={styles.weekNavBtn} onClick={prevMonth}><ChevronLeft size={18} /></button>
          <div style={styles.weekRange}>{monthName(month)} {year}</div>
          <button style={styles.weekNavBtn} onClick={nextMonth}><ChevronRight size={18} /></button>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <Activity size={16} color="#2D4A3E" />
            <div style={styles.statLabel}>Sessões realizadas</div>
            <div style={styles.statBig}>{monthAppts.length}</div>
          </div>
          <div style={styles.statCard}>
            <TrendingUp size={16} color="#2D4A3E" />
            <div style={styles.statLabel}>Faturado no mês</div>
            <div style={styles.statBig}>{BRL(monthRevenue)}</div>
          </div>
          <div style={styles.statCard}>
            <Wallet size={16} color="#557A5E" />
            <div style={styles.statLabel}>Recebido no mês</div>
            <div style={{ ...styles.statBig, color: '#557A5E' }}>{BRL(monthReceived)}</div>
          </div>
          <div style={styles.statCard}>
            <AlertCircle size={16} color="#B95F3D" />
            <div style={styles.statLabel}>A receber (total)</div>
            <div style={{ ...styles.statBig, color: '#B95F3D' }}>{BRL(totalOutstanding)}</div>
          </div>
        </div>

        <div style={styles.sectionTitle}>Pendentes</div>
        {outstanding.length === 0 ? (
          <div style={styles.allClearCard}>
            <CheckCircle2 size={20} color="#557A5E" />
            <div>
              <div style={styles.allClearTitle}>Tudo em dia</div>
              <div style={styles.allClearText}>Sem saldos pendentes no momento.</div>
            </div>
          </div>
        ) : (
          <div style={styles.list}>
            {outstanding.map(({ patient, balance, completed }) => (
              <button key={patient.id} style={styles.patientCard} onClick={() => onPatient(patient.id)}>
                <div style={{ ...styles.avatar, ...(patient.type === 'pilates' ? styles.avatarPilates : styles.avatarHomecare) }}>
                  {patient.type === 'pilates' ? <Flower2 size={18} /> : <Stethoscope size={18} />}
                </div>
                <div style={styles.patientInfo}>
                  <div style={styles.patientName}>{patient.name}</div>
                  <div style={styles.patientMeta}>
                    {completed} {completed === 1 ? 'sessão' : 'sessões'} · {BRL(patient.sessionPrice)}/sessão
                  </div>
                </div>
                <div style={{ ...styles.balanceTag, background: '#F4DDD0', color: '#8B4A2F' }}>{BRL(balance)}</div>
              </button>
            ))}
          </div>
        )}

        {monthPayments.length > 0 && (
          <>
            <div style={styles.sectionTitle}>Pagamentos do mês</div>
            <div style={styles.list}>
              {[...monthPayments].sort((a, b) => b.date.localeCompare(a.date)).map(pay => {
                const p = patients.find(pp => pp.id === pay.patientId);
                return (
                  <button key={pay.id} style={styles.paymentRowFin} onClick={() => p && onPatient(p.id)}>
                    <div>
                      <div style={styles.patientName}>{p?.name || '—'}</div>
                      <div style={styles.patientMeta}>{fmtDateBR(pay.date)} · {pay.method || 'Pagamento'}</div>
                    </div>
                    <div style={styles.paymentAmountFin}>{BRL(pay.amount)}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============== FORMS / MODALS ==============
function PatientForm({ patient, onClose, onSubmit }) {
  const [name, setName] = useState(patient?.name || '');
  const [type, setType] = useState(patient?.type || 'pilates');
  const [phone, setPhone] = useState(patient?.phone || '');
  const [sessionPrice, setSessionPrice] = useState(patient?.sessionPrice || '');
  const [notes, setNotes] = useState(patient?.notes || '');

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(), type, phone: phone.trim(),
      sessionPrice: sessionPrice ? Number(sessionPrice) : null,
      notes: notes.trim(),
    });
  };

  return (
    <Modal title={patient ? 'Editar paciente' : 'Novo paciente'} onClose={onClose} onSubmit={submit} submitLabel={patient ? 'Salvar' : 'Cadastrar'} canSubmit={!!name.trim()}>
      <Field label="Nome">
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" autoFocus />
      </Field>
      <Field label="Tipo">
        <div style={styles.typeRow}>
          <button style={type === 'pilates' ? styles.typeBtnActive : styles.typeBtn} onClick={() => setType('pilates')}>
            <Flower2 size={14} /> Pilates
          </button>
          <button style={type === 'homecare' ? styles.typeBtnActive : styles.typeBtn} onClick={() => setType('homecare')}>
            <Stethoscope size={14} /> Homecare
          </button>
        </div>
      </Field>
      <Field label="Telefone">
        <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 98888-7777" inputMode="tel" />
      </Field>
      <Field label="Valor por sessão (R$)" hint="Use para calcular saldo a receber. Para Pilates mensal, divida o valor pela quantidade de aulas/mês.">
        <input style={styles.input} value={sessionPrice} onChange={(e) => setSessionPrice(e.target.value)} placeholder="150" inputMode="decimal" />
      </Field>
      <Field label="Observações" hint="Diagnóstico, contraindicações, contato familiar, etc.">
        <textarea style={{ ...styles.input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas clínicas, contato responsável…" />
      </Field>
    </Modal>
  );
}

function ApptForm({ patients, initial, onClose, onSubmit }) {
  const [patientId, setPatientId] = useState(initial?.patientId || patients[0]?.id || '');
  const [date, setDate] = useState(initial?.date || todayISO());
  const [time, setTime] = useState('08:00');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [recur, setRecur] = useState(false);
  const [recurWeeks, setRecurWeeks] = useState('11'); // total of 12 occurrences

  if (patients.length === 0) {
    return (
      <Modal title="Novo agendamento" onClose={onClose}>
        <div style={styles.emptyText}>Cadastre um paciente antes de agendar.</div>
      </Modal>
    );
  }

  const submit = () => {
    if (!patientId || !date || !time) return;
    onSubmit({
      patientId, date, time, duration: Number(duration),
      notes: notes.trim(),
      recurWeeks: recur ? Number(recurWeeks) : 0,
    });
  };

  return (
    <Modal title="Novo agendamento" onClose={onClose} onSubmit={submit} submitLabel="Agendar" canSubmit={!!patientId && !!date && !!time}>
      <Field label="Paciente">
        <select style={styles.input} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name} · {p.type === 'pilates' ? 'Pilates' : 'Homecare'}</option>)}
        </select>
      </Field>
      <div style={styles.row2}>
        <Field label="Data">
          <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Horário">
          <input type="time" style={styles.input} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Duração">
        <div style={styles.durRow}>
          {[30, 45, 60, 90].map(d => (
            <button key={d} style={duration === String(d) ? styles.durBtnActive : styles.durBtn} onClick={() => setDuration(String(d))}>
              {d}min
            </button>
          ))}
        </div>
      </Field>
      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={recur} onChange={(e) => setRecur(e.target.checked)} />
        <Repeat size={14} /> Repetir semanalmente
      </label>
      {recur && (
        <Field label="Por quantas semanas mais?" hint="Cria um agendamento por semana, no mesmo dia e horário.">
          <input style={styles.input} value={recurWeeks} onChange={(e) => setRecurWeeks(e.target.value)} inputMode="numeric" />
        </Field>
      )}
      <Field label="Observações">
        <input style={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Foco da sessão, materiais…" />
      </Field>
    </Modal>
  );
}

function ApptDetailModal({ appt, patient, onClose, onAction, onPatient }) {
  if (!patient) return null;
  const isDone = appt.status === 'completed';
  const isCancel = appt.status === 'cancelled';
  return (
    <Modal title="Atendimento" onClose={onClose}>
      <div style={styles.apptDetailBlock}>
        <button style={styles.apptDetailName} onClick={onPatient}>{patient.name}</button>
        <div style={styles.apptDetailMeta}>{patient.type === 'pilates' ? 'Pilates' : 'Homecare'}</div>
        <div style={styles.apptDetailRow}>
          <Calendar size={14} /> {fmtDateLong(appt.date)}
        </div>
        <div style={styles.apptDetailRow}>
          <Clock size={14} /> {appt.time} · {appt.duration}min
        </div>
        {appt.notes && <div style={styles.apptDetailRow}><FileText size={14} /> {appt.notes}</div>}
        {(isDone || isCancel) && (
          <div style={{ ...styles.statusPill, ...(isDone ? styles.pillDone : styles.pillCancel), marginTop: 8 }}>
            {isDone ? 'Concluído' : 'Cancelado'}
          </div>
        )}
      </div>
      <div style={styles.modalActions}>
        {!isDone && !isCancel ? (
          <>
            <button style={styles.btnDone} onClick={() => onAction('complete')}>
              <Check size={16} /> Concluir
            </button>
            <button style={styles.btnCancel} onClick={() => onAction('cancel')}>
              <X size={16} /> Cancelar
            </button>
          </>
        ) : (
          <button style={styles.btnSecondary} onClick={() => onAction('undo')}>
            <Repeat size={14} /> Reabrir
          </button>
        )}
        <button style={styles.btnDanger} onClick={() => { if (confirm('Excluir este agendamento?')) onAction('delete'); }}>
          <Trash2 size={14} /> Excluir
        </button>
      </div>
    </Modal>
  );
}

function PaymentForm({ patients, initial, onClose, onSubmit }) {
  const [patientId, setPatientId] = useState(initial?.patientId || patients[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState('Pix');
  const [notes, setNotes] = useState('');

  const submit = () => {
    if (!patientId || !amount) return;
    onSubmit({ patientId, amount: Number(amount), date, method, notes: notes.trim() });
  };

  return (
    <Modal title="Registrar pagamento" onClose={onClose} onSubmit={submit} submitLabel="Salvar" canSubmit={!!patientId && !!amount}>
      <Field label="Paciente">
        <select style={styles.input} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Valor recebido (R$)">
        <input style={styles.input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="600" inputMode="decimal" autoFocus />
      </Field>
      <Field label="Data">
        <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Forma">
        <div style={styles.methodRow}>
          {['Pix', 'Dinheiro', 'Transferência', 'Cartão'].map(m => (
            <button key={m} style={method === m ? styles.methodBtnActive : styles.methodBtn} onClick={() => setMethod(m)}>{m}</button>
          ))}
        </div>
      </Field>
      <Field label="Observação">
        <input style={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: Mensalidade Maio · 4 sessões" />
      </Field>
    </Modal>
  );
}

// ============== UI PRIMITIVES ==============
function Modal({ title, children, onClose, onSubmit, submitLabel, canSubmit = true }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHandle} />
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{title}</h2>
          <button style={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={styles.modalBody}>{children}</div>
        {onSubmit && (
          <div style={styles.modalFooter}>
            <button style={{ ...styles.btnPrimary, opacity: canSubmit ? 1 : 0.4 }} onClick={canSubmit ? onSubmit : undefined}>
              {submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
      {hint && <div style={styles.fieldHint}>{hint}</div>}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button style={active ? styles.chipActive : styles.chip} onClick={onClick}>{children}</button>
  );
}

function TabButton({ icon: Icon, label, active, onClick }) {
  return (
    <button style={styles.tab} onClick={onClick}>
      <Icon size={20} color={active ? '#2D4A3E' : '#9A8E7E'} strokeWidth={active ? 2.2 : 1.7} />
      <span style={{ ...styles.tabLabel, color: active ? '#2D4A3E' : '#9A8E7E', fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
  );
}

function FAB({ onClick }) {
  return (
    <button style={styles.fab} onClick={onClick} aria-label="Adicionar">
      <Plus size={24} strokeWidth={2.4} />
    </button>
  );
}

function EmptyState({ icon: Icon, title, text, actionLabel, onAction }) {
  return (
    <div style={styles.emptyWrap}>
      <div style={styles.emptyIcon}><Icon size={28} color="#9A8E7E" /></div>
      <div style={styles.emptyTitle}>{title}</div>
      <div style={styles.emptyDesc}>{text}</div>
      {actionLabel && (
        <button style={styles.btnPrimary} onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}

// ============== STYLES ==============
const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
  button { cursor: pointer; border: none; background: none; font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  input:focus, select:focus, textarea:focus { outline: 2px solid #2D4A3E33; outline-offset: 1px; }
`;

const C = {
  bg: '#F5F1EA',
  card: '#FFFFFF',
  primary: '#2D4A3E',
  primaryLight: '#4A6D5C',
  accent: '#B95F3D',
  success: '#557A5E',
  successBg: '#E0EBE2',
  warn: '#C9824A',
  warnBg: '#F4DDD0',
  danger: '#A04444',
  dangerBg: '#F0DADA',
  text: '#1F1B16',
  muted: '#6B6055',
  faint: '#9A8E7E',
  border: '#E5DFD3',
  borderSoft: '#EFE9DD',
};

const styles = {
  app: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"DM Sans", -apple-system, sans-serif', fontSize: 15, lineHeight: 1.5, paddingBottom: 76, position: 'relative' },
  loading: { minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  viewport: { maxWidth: 480, margin: '0 auto' },
  view: { paddingBottom: 24 },
  header: { padding: '24px 20px 16px', borderBottom: `1px solid ${C.borderSoft}` },
  headerSubtle: { fontSize: 12, color: C.faint, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 500 },
  headerTitle: { fontFamily: '"Fraunces", serif', fontSize: 36, fontWeight: 500, margin: '4px 0 8px', color: C.text, letterSpacing: -0.5 },
  headerStat: { fontSize: 14, color: C.muted },
  content: { padding: '16px 20px' },

  list: { display: 'flex', flexDirection: 'column', gap: 8 },

  // Today appt card
  apptCard: { display: 'flex', gap: 12, padding: 14, background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, alignItems: 'flex-start' },
  apptCardDone: { background: '#FAFAF6', opacity: 0.75 },
  apptCardCancel: { background: '#FAFAF6', opacity: 0.55 },
  apptTime: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56, paddingTop: 2 },
  apptTimeBig: { fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 500, color: C.primary, lineHeight: 1 },
  apptTimeDur: { fontSize: 11, color: C.faint, marginTop: 4 },
  apptBody: { flex: 1, minWidth: 0 },
  apptName: { fontSize: 16, fontWeight: 600, color: C.text, padding: 0, textAlign: 'left', display: 'block' },
  apptMeta: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: C.muted, marginTop: 2 },
  apptNote: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  apptActions: { display: 'flex', gap: 6, alignItems: 'flex-start' },

  iconBtnDone: { width: 36, height: 36, borderRadius: 10, background: C.successBg, color: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconBtnCancel: { width: 36, height: 36, borderRadius: 10, background: C.dangerBg, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconBtnUndo: { width: 32, height: 32, borderRadius: 8, background: C.borderSoft, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  statusPill: { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, marginTop: 4 },
  pillDone: { background: C.successBg, color: C.success },
  pillCancel: { background: C.dangerBg, color: C.danger },
  dot: { color: C.faint, margin: '0 2px' },

  // Agenda
  weekNav: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  weekNavBtn: { width: 32, height: 32, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text },
  weekRange: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 500, color: C.text },
  todayBtn: { marginTop: 10, fontSize: 12, color: C.primary, fontWeight: 600, padding: '4px 0' },
  dayBlock: { marginBottom: 16 },
  dayHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', borderBottom: `1px solid ${C.borderSoft}`, marginBottom: 8 },
  dayHeaderToday: { borderBottomColor: C.primary, borderBottomWidth: 2 },
  dayHeaderLeft: { display: 'flex', alignItems: 'baseline', gap: 10 },
  dayName: { fontSize: 11, fontWeight: 600, color: C.faint, letterSpacing: 1 },
  dayNum: { fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 500, color: C.text },
  todayBadge: { fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: 1, padding: '2px 8px', borderRadius: 6, background: C.successBg },
  dayList: { display: 'flex', flexDirection: 'column', gap: 6 },
  weekAppt: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, textAlign: 'left' },
  weekApptTime: { fontFamily: '"Fraunces", serif', fontSize: 15, color: C.primary, fontWeight: 500, minWidth: 44 },
  weekApptInfo: { flex: 1, minWidth: 0 },
  weekApptName: { fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  weekApptType: { fontSize: 12, color: C.muted },
  emptyDay: { padding: '4px 8px', color: C.faint, fontSize: 13 },

  // Patients
  search: { marginTop: 14, width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, fontSize: 15, color: C.text },
  filterRow: { display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  chip: { padding: '6px 12px', borderRadius: 999, background: C.card, border: `1px solid ${C.border}`, fontSize: 13, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 4 },
  chipActive: { padding: '6px 12px', borderRadius: 999, background: C.primary, border: `1px solid ${C.primary}`, fontSize: 13, color: '#FFF', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 },
  patientCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: 'left', width: '100%' },
  avatar: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarLg: { width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarPilates: { background: '#E0EBE2', color: C.primary },
  avatarHomecare: { background: '#F4DDD0', color: '#8B4A2F' },
  patientInfo: { flex: 1, minWidth: 0 },
  patientName: { fontSize: 15, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  patientMeta: { fontSize: 13, color: C.muted, marginTop: 2 },
  balanceTag: { padding: '4px 8px', borderRadius: 6, background: C.warnBg, color: '#8B4A2F', fontSize: 12, fontWeight: 600 },

  // Patient detail
  backBtn: { display: 'flex', alignItems: 'center', gap: 4, color: C.muted, fontSize: 13, padding: '4px 0', marginBottom: 8 },
  detailHead: { display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 },
  detailName: { fontFamily: '"Fraunces", serif', fontSize: 26, fontWeight: 500, margin: 0, color: C.text, letterSpacing: -0.3 },
  detailType: { fontSize: 13, color: C.muted, marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 10, background: C.borderSoft, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  detailInfo: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, padding: '10px 0', borderTop: `1px solid ${C.borderSoft}`, borderBottom: `1px solid ${C.borderSoft}` },
  infoRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.muted, textDecoration: 'none' },
  balanceCard: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14, marginTop: 8 },
  balanceRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  balanceLabel: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500 },
  balanceValue: { fontFamily: '"Fraunces", serif', fontSize: 28, fontWeight: 500, marginTop: 4, lineHeight: 1 },
  balanceMini: { display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.borderSoft}`, paddingTop: 12, fontSize: 12, color: C.muted },
  balanceMiniLabel: { display: 'block', marginBottom: 2 },
  addPayBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: C.primary, color: '#FFF', borderRadius: 10, fontSize: 13, fontWeight: 500 },
  addPriceBtn: { marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: C.card, border: `1px dashed ${C.border}`, color: C.muted, borderRadius: 10, fontSize: 13, width: '100%', justifyContent: 'center' },

  tabsRow: { display: 'flex', gap: 0, padding: '0 20px', borderBottom: `1px solid ${C.borderSoft}` },
  subtab: { padding: '12px 14px', fontSize: 13, color: C.muted, fontWeight: 500, borderBottom: '2px solid transparent' },
  subtabActive: { padding: '12px 14px', fontSize: 13, color: C.primary, fontWeight: 600, borderBottom: `2px solid ${C.primary}` },

  detailApptRow: { display: 'flex', gap: 12, padding: 12, background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, alignItems: 'center' },
  detailApptDate: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 },
  detailApptDay: { fontSize: 10, color: C.faint, fontWeight: 600, letterSpacing: 1 },
  detailApptDayNum: { fontFamily: '"Fraunces", serif', fontSize: 22, color: C.text, fontWeight: 500 },
  detailApptTime: { fontSize: 14, fontWeight: 500, color: C.text },
  detailApptNotes: { fontSize: 12, color: C.muted, marginTop: 2 },

  paymentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: C.card, borderRadius: 12, border: `1px solid ${C.border}` },
  paymentRowFin: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: 'left', width: '100%' },
  paymentAmount: { fontFamily: '"Fraunces", serif', fontSize: 18, fontWeight: 500, color: C.success },
  paymentAmountFin: { fontFamily: '"Fraunces", serif', fontSize: 17, fontWeight: 500, color: C.success },
  paymentMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  delBtnSm: { width: 28, height: 28, borderRadius: 8, background: C.dangerBg, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dangerBtn: { marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', color: C.danger, fontSize: 13, fontWeight: 500, width: '100%', borderRadius: 10 },

  // Finance
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 },
  statCard: { padding: 14, background: C.card, borderRadius: 12, border: `1px solid ${C.border}` },
  statLabel: { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, marginTop: 8 },
  statBig: { fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 500, color: C.text, marginTop: 4, lineHeight: 1.1 },
  sectionTitle: { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginTop: 8, marginBottom: 10 },
  allClearCard: { display: 'flex', gap: 10, padding: 14, background: C.successBg, borderRadius: 12, alignItems: 'center' },
  allClearTitle: { fontSize: 14, fontWeight: 600, color: C.success },
  allClearText: { fontSize: 12, color: C.muted, marginTop: 2 },

  // Empty
  emptyWrap: { padding: '32px 16px', textAlign: 'center' },
  emptyIcon: { width: 60, height: 60, borderRadius: 16, background: C.borderSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
  emptyTitle: { fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 500, color: C.text, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: C.muted, maxWidth: 280, margin: '0 auto 18px', lineHeight: 1.5 },
  emptyText: { padding: 24, textAlign: 'center', color: C.faint, fontSize: 14 },

  // Tabbar
  tabbar: { position: 'fixed', bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', padding: '8px 0 calc(8px + env(safe-area-inset-bottom, 0))', maxWidth: 480, margin: '0 auto', zIndex: 50 },
  tab: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0' },
  tabLabel: { fontSize: 10.5, letterSpacing: 0.3 },

  // FAB
  fab: { position: 'fixed', bottom: 92, right: 'calc(50% - 240px + 20px)', width: 54, height: 54, borderRadius: 18, background: C.primary, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(45,74,62,0.35)', zIndex: 40 },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(31,27,22,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 0.2s ease' },
  modal: { background: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%', maxWidth: 480, maxHeight: '92vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom, 0)' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, background: C.border, margin: '8px auto 0' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 4px' },
  modalTitle: { fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 500, margin: 0, color: C.text },
  modalClose: { width: 32, height: 32, borderRadius: 8, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: '12px 20px', overflowY: 'auto', flex: 1 },
  modalFooter: { padding: '12px 20px 16px', borderTop: `1px solid ${C.borderSoft}` },
  modalActions: { padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${C.borderSoft}` },

  // Form
  field: { marginBottom: 14 },
  fieldLabel: { display: 'block', fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  fieldHint: { fontSize: 12, color: C.faint, marginTop: 4, lineHeight: 1.4 },
  input: { width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, fontSize: 15, color: C.text },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  typeRow: { display: 'flex', gap: 8 },
  typeBtn: { flex: 1, padding: '10px', borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, fontSize: 14, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  typeBtnActive: { flex: 1, padding: '10px', borderRadius: 10, background: C.primary, border: `1px solid ${C.primary}`, fontSize: 14, color: '#FFF', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  durRow: { display: 'flex', gap: 6 },
  durBtn: { flex: 1, padding: '10px', borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, fontSize: 13, color: C.muted },
  durBtnActive: { flex: 1, padding: '10px', borderRadius: 10, background: C.primary, border: `1px solid ${C.primary}`, fontSize: 13, color: '#FFF', fontWeight: 500 },
  methodRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  methodBtn: { padding: '10px', borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, fontSize: 13, color: C.muted },
  methodBtnActive: { padding: '10px', borderRadius: 10, background: C.primary, border: `1px solid ${C.primary}`, fontSize: 13, color: '#FFF', fontWeight: 500 },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', fontSize: 14, color: C.text, cursor: 'pointer' },

  // Buttons
  btnPrimary: { width: '100%', padding: '14px', borderRadius: 12, background: C.primary, color: '#FFF', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnSecondary: { width: '100%', padding: '12px', borderRadius: 12, background: C.card, color: C.text, border: `1px solid ${C.border}`, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnDone: { width: '100%', padding: '12px', borderRadius: 12, background: C.success, color: '#FFF', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnCancel: { width: '100%', padding: '12px', borderRadius: 12, background: C.warnBg, color: '#8B4A2F', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnDanger: { width: '100%', padding: '10px', borderRadius: 12, background: 'transparent', color: C.danger, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },

  apptDetailBlock: { padding: '8px 0 16px', borderBottom: `1px solid ${C.borderSoft}`, marginBottom: 8 },
  apptDetailName: { fontFamily: '"Fraunces", serif', fontSize: 22, fontWeight: 500, color: C.text, padding: 0 },
  apptDetailMeta: { fontSize: 13, color: C.muted, marginBottom: 12 },
  apptDetailRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.muted, marginBottom: 6 },
};
