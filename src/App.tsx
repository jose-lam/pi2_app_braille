import React, { useCallback, useEffect, useState } from 'react';
import { Monitor, Settings2, Trash2 } from 'lucide-react';
import {
  api,
  getGlobalSessionId,
  getStoredToken,
  setStoredToken,
} from './api/client';
import { AuthView } from './components/AuthView';
import { BrailleCellApple } from './components/BrailleCellApple';
import { DevicesBentoGrid } from './components/DevicesBentoGrid';
import { FirmwareAndDeployView } from './components/FirmwareAndDeployView';
import { NowBroadcastingBar } from './components/NowBroadcastingBar';
import {
  AddDeviceModal,
  NewRoomModal,
  RoomNetworkModal,
  TeamModal,
} from './components/RoomModals';
import { RoomTextEditor } from './components/RoomTextEditor';
import { SidebarRooms } from './components/SidebarRooms';
import {
  AuthResponse,
  Esp32Device,
  RoomDetail,
  RoomSummary,
  Tenant,
  User,
} from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [guestDocsTab, setGuestDocsTab] = useState<'firmware' | 'deploy' | null>(null);

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [activeSection, setActiveSection] = useState<'workspace' | 'firmware' | 'deploy'>('workspace');

  const [isBusy, setIsBusy] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Modales
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const sessionId = getGlobalSessionId();

  const loadRooms = useCallback(async (preferRoomId?: number) => {
    const list = await api.listRooms();
    setRooms(list);
    if (list.length > 0) {
      setSelectedRoomId((prev) => {
        if (preferRoomId && list.some((r) => r.id === preferRoomId)) {
          return preferRoomId;
        }
        if (prev && list.some((r) => r.id === prev)) {
          return prev;
        }
        return list[0].id;
      });
    } else {
      setSelectedRoomId(null);
      setRoomDetail(null);
    }
  }, []);

  const loadRoomDetail = useCallback(async (roomId: number) => {
    try {
      const detail = await api.getRoom(roomId);
      setRoomDetail(detail);
      setErrorBanner(null);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Error al obtener estado del salón.'
      );
    }
  }, []);

  // Restaurar sesión JWT existente
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    api
      .me()
      .then(async (res) => {
        setUser(res.user);
        setTenant(res.tenant);
        await loadRooms();
      })
      .catch(() => {
        setStoredToken(null);
      })
      .finally(() => {
        setIsBootstrapping(false);
      });
  }, [loadRooms]);

  // Cargar detalle cuando cambia el salón seleccionado
  useEffect(() => {
    if (user && selectedRoomId !== null) {
      loadRoomDetail(selectedRoomId);
    }
  }, [user, selectedRoomId, loadRoomDetail]);

  // Sondeo en tiempo real (telemetría de ESP32s y posición de lectura)
  useEffect(() => {
    if (!user || selectedRoomId === null || activeSection !== 'workspace') {
      return;
    }
    const interval = setInterval(() => {
      loadRoomDetail(selectedRoomId);
      api.listRooms().then(setRooms).catch(() => {});
    }, 2500);
    return () => clearInterval(interval);
  }, [user, selectedRoomId, activeSection, loadRoomDetail]);

  // Heartbeat de Computadora Global si esta PC está vinculada al salón activo
  const isThisComputerLinked = Boolean(
    roomDetail && roomDetail.global_session_id === sessionId
  );

  useEffect(() => {
    if (!user || !roomDetail || !isThisComputerLinked) return;
    const hb = setInterval(() => {
      api
        .heartbeatGlobalComputer(roomDetail.id, {
          session_id: sessionId,
          computer_label: navigator.platform || 'Computadora Global',
        })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(hb);
  }, [user, roomDetail, isThisComputerLinked, sessionId]);

  const handleAuthenticated = async (auth: AuthResponse) => {
    setUser(auth.user);
    setTenant(auth.tenant);
    setGuestDocsTab(null);
    await loadRooms();
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setTenant(null);
    setRooms([]);
    setSelectedRoomId(null);
    setRoomDetail(null);
  };

  const handleLinkGlobalComputer = async () => {
    if (!roomDetail) return;
    setIsBusy(true);
    try {
      const updated = await api.linkGlobalComputer(roomDetail.id, {
        session_id: sessionId,
        computer_label: `${user?.full_name || 'Operador'} · PC Salón`,
      });
      setRoomDetail(updated);
      await loadRooms(updated.id);
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : 'No se pudo vincular esta PC.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleControl = useCallback(
    async (action: 'inicio' | 'siguiente' | 'anterior') => {
      if (!roomDetail) return;
      setIsBusy(true);
      try {
        const updated = await api.controlRoom(roomDetail.id, action);
        setRoomDetail(updated);
      } catch (err: unknown) {
        setErrorBanner(
          err instanceof Error ? err.message : 'Error al controlar lectura.'
        );
      } finally {
        setIsBusy(false);
      }
    },
    [roomDetail]
  );

  // Atajos de teclado en escritorio (Flecha Izq, Flecha Der, Home)
  useEffect(() => {
    if (!user || activeSection !== 'workspace' || !roomDetail) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleControl('siguiente');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleControl('anterior');
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleControl('inicio');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [user, activeSection, roomDetail, handleControl]);

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center text-sm text-zinc-400">
        Cargando sesión...
      </div>
    );
  }

  if (!user || !tenant) {
    if (guestDocsTab) {
      return (
        <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F7] px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <FirmwareAndDeployView
              mode={guestDocsTab}
              onBack={() => setGuestDocsTab(null)}
            />
          </div>
        </div>
      );
    }

    return (
      <AuthView
        onAuthenticated={handleAuthenticated}
        onOpenDocs={(tab) => setGuestDocsTab(tab)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F7] flex flex-col lg:flex-row">
      <SidebarRooms
        tenant={tenant}
        user={user}
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        activeSection={activeSection}
        onSelectRoom={(id) => setSelectedRoomId(id)}
        onChangeSection={setActiveSection}
        onOpenNewRoom={() => setShowNewRoomModal(true)}
        onOpenTeamModal={() => setShowTeamModal(true)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 px-6 sm:px-8 py-6 max-w-7xl w-full mx-auto space-y-8">
          {errorBanner && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between gap-4">
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {activeSection === 'firmware' ? (
            <FirmwareAndDeployView mode="firmware" />
          ) : activeSection === 'deploy' ? (
            <FirmwareAndDeployView mode="deploy" />
          ) : !roomDetail ? (
            <div className="rounded-2xl bg-[#121216] border border-white/[0.08] p-12 text-center space-y-4">
              <h1 className="text-xl font-display font-semibold text-white">
                Bienvenido a {tenant.name}
              </h1>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                Crea un salón para vincular tu Computadora Global, cargar textos
                y generar tokens únicos para tus dispositivos ESP32.
              </p>
              <button
                type="button"
                onClick={() => setShowNewRoomModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold cursor-pointer"
              >
                Crear Primer Salón
              </button>
            </div>
          ) : (
            <>
              {/* Encabezado contextual del Salón */}
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">
                    {tenant.name} / {roomDetail.name}
                  </p>
                  <h1 className="text-2xl font-display font-semibold text-white mt-0.5 truncate">
                    {roomDetail.name}
                  </h1>
                  <p className="text-xs text-zinc-400 mt-1 font-mono">
                    Wi-Fi: {roomDetail.wifi_ssid || 'No definido'} · IP Salón:{' '}
                    {roomDetail.allowed_public_ip || 'Sin capturar'} · Bloqueo IP:{' '}
                    {roomDetail.strict_ip_check ? 'Estricto' : 'Desactivado'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleLinkGlobalComputer}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isThisComputerLinked
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white text-zinc-950 hover:bg-zinc-200'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>
                      {isThisComputerLinked
                        ? 'Esta PC es la Computadora Global'
                        : 'Vincular esta PC como Global'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNetworkModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Red y Wi-Fi</span>
                  </button>

                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteRoom(roomDetail.id);
                        await loadRooms();
                      }}
                      title="Eliminar salón"
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </header>

              {/* Zona Principal: Celda Braille Táctil Apple + Editor de Texto del Salón */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                <div className="xl:col-span-5 flex flex-col">
                  <BrailleCellApple
                    size="lg"
                    dots={roomDetail.braille_state.braille}
                    char={roomDetail.braille_state.char}
                    unicodeBraille={roomDetail.braille_state.unicodeBraille}
                  />
                </div>
                <div className="xl:col-span-7 flex flex-col">
                  <RoomTextEditor
                    currentText={roomDetail.current_text}
                    filename={roomDetail.filename}
                    initialPosition={roomDetail.initial_position}
                    globalPosition={roomDetail.braille_state.position}
                    isSaving={isSavingText}
                    onBroadcastText={async (text, fname, initPos) => {
                      setIsSavingText(true);
                      try {
                        const updated = await api.updateRoomText(roomDetail.id, {
                          text,
                          filename: fname,
                          initial_position: initPos,
                        });
                        setRoomDetail(updated);
                      } finally {
                        setIsSavingText(false);
                      }
                    }}
                    onUploadFile={async (file, initPos) => {
                      setIsSavingText(true);
                      try {
                        const updated = await api.uploadRoomTxtFile(
                          roomDetail.id,
                          file,
                          initPos
                        );
                        setRoomDetail(updated);
                      } finally {
                        setIsSavingText(false);
                      }
                    }}
                    onSelectPosition={async (pos) => {
                      const updated = await api.setRoomPosition(
                        roomDetail.id,
                        pos
                      );
                      setRoomDetail(updated);
                    }}
                  />
                </div>
              </div>

              {/* Bento Grid de Dispositivos ESP32 */}
              <DevicesBentoGrid
                devices={roomDetail.devices}
                syncMode={roomDetail.sync_mode}
                onOpenAddDevice={() => setShowAddDeviceModal(true)}
                onRotateToken={async (deviceId) => {
                  await api.updateDevice(deviceId, { rotate_token: true });
                  await loadRoomDetail(roomDetail.id);
                }}
                onToggleActive={async (device: Esp32Device) => {
                  await api.updateDevice(device.id, {
                    is_active: !device.is_active,
                  });
                  await loadRoomDetail(roomDetail.id);
                }}
                onDeleteDevice={async (deviceId) => {
                  await api.deleteDevice(deviceId);
                  await loadRoomDetail(roomDetail.id);
                }}
              />
            </>
          )}
        </main>

        {/* Barra Inferior Estilo Spotify ("Now Broadcasting") */}
        {activeSection === 'workspace' && roomDetail && (
          <NowBroadcastingBar
            room={roomDetail}
            isThisComputerLinked={isThisComputerLinked}
            isBusy={isBusy}
            onControl={handleControl}
            onToggleSyncMode={async (nextSync) => {
              const updated = await api.updateRoom(roomDetail.id, {
                sync_mode: nextSync,
              });
              setRoomDetail(updated);
              await loadRooms(updated.id);
            }}
          />
        )}
      </div>

      {/* Modales */}
      <NewRoomModal
        isOpen={showNewRoomModal}
        onClose={() => setShowNewRoomModal(false)}
        onCreate={async (payload) => {
          const created = await api.createRoom(payload);
          await loadRooms(created.id);
          setSelectedRoomId(created.id);
          setRoomDetail(created);
          setActiveSection('workspace');
        }}
      />

      {roomDetail && (
        <>
          <RoomNetworkModal
            isOpen={showNetworkModal}
            room={roomDetail}
            onClose={() => setShowNetworkModal(false)}
            onSave={async (payload) => {
              const updated = await api.updateRoom(roomDetail.id, payload);
              setRoomDetail(updated);
              await loadRooms(updated.id);
            }}
          />

          <AddDeviceModal
            isOpen={showAddDeviceModal}
            roomName={roomDetail.name}
            wifiSsid={roomDetail.wifi_ssid}
            onClose={() => setShowAddDeviceModal(false)}
            onRegister={async (name) => {
              const dev = await api.registerDevice(roomDetail.id, name);
              await loadRoomDetail(roomDetail.id);
              await loadRooms(roomDetail.id);
              return dev;
            }}
          />
        </>
      )}

      <TeamModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
      />
    </div>
  );
}
