import React from 'react';
import { LogOut, Plus, Users } from 'lucide-react';
import { RoomSummary, Tenant, User } from '../types';

interface SidebarRoomsProps {
  tenant: Tenant;
  user: User;
  rooms: RoomSummary[];
  selectedRoomId: number | null;
  activeSection: 'workspace' | 'firmware' | 'deploy';
  onSelectRoom: (roomId: number) => void;
  onChangeSection: (section: 'workspace' | 'firmware' | 'deploy') => void;
  onOpenNewRoom: () => void;
  onOpenTeamModal: () => void;
  onLogout: () => void;
}

export const SidebarRooms: React.FC<SidebarRoomsProps> = ({
  tenant,
  user,
  rooms,
  selectedRoomId,
  activeSection,
  onSelectRoom,
  onChangeSection,
  onOpenNewRoom,
  onOpenTeamModal,
  onLogout,
}) => {
  return (
    <aside className="w-full lg:w-[268px] shrink-0 bg-[#121216] border-b lg:border-b-0 lg:border-r border-white/[0.08] flex flex-col justify-between">
      <div className="p-5 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-display font-semibold tracking-tight text-white truncate">
              BrailleCloud
            </p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{tenant.name}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Salones</span>
            <button
              type="button"
              onClick={onOpenNewRoom}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo</span>
            </button>
          </div>

          <div className="space-y-1">
            {rooms.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3">
                Crea tu primer salón para vincular dispositivos ESP32.
              </p>
            ) : (
              rooms.map((room) => {
                const isSelected =
                  activeSection === 'workspace' && room.id === selectedRoomId;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      onChangeSection('workspace');
                      onSelectRoom(room.id);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1D1D24] text-white'
                        : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {room.name}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-zinc-400 shrink-0">
                        {room.online_device_count}/{room.device_count}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {room.wifi_ssid || 'Sin Wi-Fi asignado'} ·{' '}
                      {room.sync_mode ? 'Sincronizado' : 'Libre'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.06] space-y-1">
          <p className="text-xs font-medium text-zinc-400 mb-2">Recursos</p>
          <button
            type="button"
            onClick={() => onChangeSection('firmware')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeSection === 'firmware'
                ? 'bg-[#1D1D24] text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            Firmware ESP32 (.ino)
          </button>
          <button
            type="button"
            onClick={() => onChangeSection('deploy')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeSection === 'deploy'
                ? 'bg-[#1D1D24] text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            Guía AWS EC2
          </button>
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={onOpenTeamModal}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>Docentes del Tenant</span>
              <Users className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-200 truncate">
            {user.full_name}
          </p>
          <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Cerrar sesión"
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
