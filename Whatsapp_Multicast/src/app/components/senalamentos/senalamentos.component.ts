import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Semana, Senalamento } from '../../models/senalamento.model';
import { SenalamentosService } from '../../services/senalamentos.service';
import { SemanaPickerDialogComponent } from './semana-picker-dialog/semana-picker-dialog.component';
import { SenalamantoDialogComponent } from './senalamento-dialog/senalamento-dialog.component';
import { forkJoin, firstValueFrom } from 'rxjs';
import {
  RenotifyConfirmDialogComponent,
  RenotifyDecision
} from './renotify-confirm-dialog/renotify-confirm-dialog.component';

@Component({
  selector: 'app-senalamentos',
  templateUrl: './senalamentos.component.html',
  styleUrls: ['./senalamentos.component.scss']
})
export class SenalamentosComponent implements OnInit {
  semanasFuturas: Semana[] = [];
  semanasPasadas: Semana[] = [];
  senalamentosBySemana: Record<string, Senalamento[]> = {};
  loading = false;
  expandedSemana: string | null = null;
  expandedPasadas = false;

  readonly DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  readonly MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  constructor(
    private service: SenalamentosService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.service.getSemanas().subscribe({
      next: semanas => {
        // Separar semanas pasadas y futuras
        const today = new Date().toISOString().split('T')[0];
        this.semanasPasadas = [];
        this.semanasFuturas = [];
        
        semanas.forEach(s => {
          if (s.fechaFin < today) {
            this.semanasPasadas.push(s);
          } else {
            this.semanasFuturas.push(s);
          }
        });
        
        // Ordenar futuras de más próxima a más lejana
        this.semanasFuturas.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
        // Ordenar pasadas de más reciente a más lejana
        this.semanasPasadas.sort((a, b) => b.fechaFin.localeCompare(a.fechaFin));
        
        const allSemanas = [...this.semanasFuturas, ...this.semanasPasadas];
        if (allSemanas.length === 0) { this.loading = false; return; }
        
        // Cargar señalamientos de todas las semanas en paralelo
        const requests = allSemanas.reduce((acc, s) => {
          acc[s.id] = this.service.getSenalamentos(s.id);
          return acc;
        }, {} as any);
        forkJoin(requests).subscribe({
          next: (result: any) => {
            this.senalamentosBySemana = result;
            this.loading = false;
            // Expandir la primer semana futura por defecto
            if (!this.expandedSemana && this.semanasFuturas.length > 0) {
              this.expandedSemana = this.semanasFuturas[0].id;
            }
          },
          error: () => {
            // Si falla la carga de señalamientos, inicializar vacíos
            allSemanas.forEach(s => { this.senalamentosBySemana[s.id] = []; });
            this.loading = false;
          }
        });
      },
      error: () => { this.semanasFuturas = []; this.semanasPasadas = []; this.loading = false; }
    });
  }

  openSemanaDialog(): void {
    this.dialog.open(SemanaPickerDialogComponent, { width: '380px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.service.createSemana(result).subscribe({
          next: semana => {
            const today = new Date().toISOString().split('T')[0];
            if (semana.fechaFin < today) {
              this.semanasPasadas = [semana, ...this.semanasPasadas];
            } else {
              this.semanasFuturas = [...this.semanasFuturas, semana].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
            }
            this.senalamentosBySemana[semana.id] = [];
            this.expandedSemana = semana.id;
            this.notify('Semana añadida');
          },
          error: err => this.notify(err.error?.error || 'Error al crear la semana', true)
        });
      });
  }

  deleteSemana(semana: Semana, event: Event): void {
    event.stopPropagation();
    const count = this.senalamentosBySemana[semana.id]?.length || 0;
    const msg = count > 0
      ? `¿Eliminar "${semana.label}" y sus ${count} señalamientos?`
      : `¿Eliminar "${semana.label}"?`;
    if (!confirm(msg)) return;

    this.service.deleteSemana(semana.id).subscribe({
      next: () => {
        this.semanasFuturas = this.semanasFuturas.filter(s => s.id !== semana.id);
        this.semanasPasadas = this.semanasPasadas.filter(s => s.id !== semana.id);
        delete this.senalamentosBySemana[semana.id];
        if (this.expandedSemana === semana.id) this.expandedSemana = null;
        this.notify('Semana eliminada');
      },
      error: () => this.notify('Error al eliminar', true)
    });
  }

  openSenalamentoDialog(semana: Semana, existing?: Senalamento): void {
    this.dialog.open(SenalamantoDialogComponent, {
      width: '540px',
      data: { semana, senalamento: existing }
    }).afterClosed().subscribe(result => {
      if (!result) return;
      if (existing) {
        this.service.updateSenalamento(existing.id, { ...result, semanaId: semana.id }).subscribe({
          next: updated => {
            const list = this.senalamentosBySemana[semana.id];
            const idx = list.findIndex(s => s.id === existing.id);
            if (idx >= 0) list[idx] = updated;
            this.senalamentosBySemana[semana.id] = this.sortByDateTime(list);
            this.notify('Señalamiento actualizado');
          },
          error: () => this.notify('Error al actualizar', true)
        });
      } else {
        this.service.createSenalamento({ ...result, semanaId: semana.id }).subscribe({
          next: created => {
            const list = [...(this.senalamentosBySemana[semana.id] || []), created];
            this.senalamentosBySemana[semana.id] = this.sortByDateTime(list);
            this.notify('Señalamiento creado');
          },
          error: () => this.notify('Error al crear', true)
        });
      }
    });
  }

  deleteSenalamento(semanaId: string, s: Senalamento): void {
    if (!confirm('¿Eliminar este señalamiento?')) return;
    this.service.deleteSenalamento(s.id).subscribe({
      next: () => {
        this.senalamentosBySemana[semanaId] = this.senalamentosBySemana[semanaId].filter(x => x.id !== s.id);
        this.notify('Señalamiento eliminado');
      },
      error: () => this.notify('Error al eliminar', true)
    });
  }

  toggleSemana(id: string): void {
    this.expandedSemana = this.expandedSemana === id ? null : id;
  }

  formatDate(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    return `${this.DIAS[d.getDay()]} ${d.getDate()} ${this.MESES[d.getMonth()]}`;
  }

  private sortByDateTime(list: Senalamento[]): Senalamento[] {
    return list.sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
  }

  canNotifySemana(semana: Semana): boolean {
    const senalamentos = this.senalamentosBySemana[semana.id] || [];
    return senalamentos.length > 0 && senalamentos.some(s => s.categoria?.grupoWhatsapp);
  }

  notifySemana(semana: Semana, event: Event): void {
    event.stopPropagation();
    const senalamentos = this.senalamentosBySemana[semana.id] || [];
    if (!senalamentos.length) {
      this.notify('No hay señalamientos para notificar', true);
      return;
    }

    this.notifySemanaFlow(semana, senalamentos);
  }

  private async notifySemanaFlow(semana: Semana, senalamentos: Senalamento[]): Promise<void> {
    const filtered = await this.filterRenotifySemana(senalamentos, semana.label);
    if (filtered.length === 0) {
      this.notify('Notificación cancelada');
      return;
    }

    // Agrupar por grupo de WhatsApp
    const porGrupo: Record<string, Senalamento[]> = {};
    filtered.forEach(s => {
      const groupId = s.categoria?.grupoWhatsapp?.id;
      if (groupId) {
        if (!porGrupo[groupId]) porGrupo[groupId] = [];
        porGrupo[groupId].push(s);
      }
    });

    if (Object.keys(porGrupo).length === 0) {
      this.notify('Ningún señalamiento tiene grupo WhatsApp asignado', true);
      return;
    }

    // Enviar notificaciones por grupo
    let enviados = 0;
    let errores = 0;
    let pendientes = Object.keys(porGrupo).length;
    const notifiedIds = new Set<string>();
    let notifiedAt: string | undefined;

    Object.entries(porGrupo).forEach(([groupId, senalamientos]) => {
      this.service.notifySenalamentos(groupId, senalamientos).subscribe({
        next: (res) => {
          enviados += res.sentMessages;
          (res.notifiedIds || []).forEach(id => notifiedIds.add(id));
          if (res.notifiedAt) notifiedAt = res.notifiedAt;
          pendientes--;
          if (pendientes === 0) {
            this.applyNotifiedStatus(semana.id, Array.from(notifiedIds), notifiedAt);
            this.notify(`${enviados} notificación(es) enviada(s)${errores > 0 ? ` (${errores} error/es)` : ''}`);
          }
        },
        error: (err) => {
          errores++;
          pendientes--;
          if (pendientes === 0) {
            this.notify(`${enviados} notificación(es) enviada(s)${errores > 0 ? ` (${errores} error/es)` : ''}`, true);
          }
        }
      });
    });
  }

  async notifySenalamento(senalamiento: Senalamento, event: Event): Promise<void> {
    event.stopPropagation();
    if (!senalamiento.categoria?.grupoWhatsapp) {
      this.notify('Este señalamiento no tiene grupo WhatsApp asignado', true);
      return;
    }

    if (senalamiento.notificado) {
      const decision = await this.askRenotify(senalamiento, 'Notificación manual', false);
      if (decision !== 'yes') return;
    }

    this.service.notifySenalamentos(senalamiento.categoria.grupoWhatsapp.id, [senalamiento]).subscribe({
      next: (res) => {
        const ids = (res.notifiedIds && res.notifiedIds.length > 0)
          ? res.notifiedIds
          : [senalamiento.id];
        this.applyNotifiedStatusById(ids, res.notifiedAt);
        this.notify('Notificación enviada');
      },
      error: (err) => this.notify(err.error?.error || 'Error al enviar notificación', true)
    });
  }

  private async filterRenotifySemana(list: Senalamento[], semanaLabel: string): Promise<Senalamento[]> {
    const selected: Senalamento[] = [];
    let yesToAll = false;
    let noToAll = false;

    for (const s of list) {
      if (!s.categoria?.grupoWhatsapp) continue;
      if (!s.notificado || yesToAll) {
        selected.push(s);
        continue;
      }
      if (noToAll) {
        continue;
      }

      const decision = await this.askRenotify(s, semanaLabel, true);
      if (decision === 'all') {
        yesToAll = true;
        selected.push(s);
      }
      if (decision === 'none') {
        noToAll = true;
        continue;
      }
      if (decision === 'yes') {
        selected.push(s);
      }
      if (decision === 'no') {
        continue;
      }
    }

    return selected;
  }

  private askRenotify(s: Senalamento, semanaLabel: string, allowAll: boolean): Promise<RenotifyDecision> {
    const categoria = [s.categoria?.categoria, s.categoria?.division, s.categoria?.genero]
      .map(v => (v || '').trim())
      .filter(Boolean)
      .join(' ') || 'Sin categoría';
    const ultimaNotificacion = s.notificadoEn
      ? ` · Ultima notificacion: ${this.formatDateTime(s.notificadoEn)}`
      : '';

    return firstValueFrom(
      this.dialog.open(RenotifyConfirmDialogComponent, {
        width: '460px',
        disableClose: true,
        data: {
          title: 'Señalamiento ya notificado',
          message: 'Este señalamiento ya fue notificado. ¿Quieres volver a enviarlo?',
          detail: `${semanaLabel} · ${this.formatDate(s.fecha)} · ${s.hora} · ${categoria}${ultimaNotificacion}`,
          allowAll
        }
      }).afterClosed()
    ).then(result => result || 'no');
  }

  private formatDateTime(iso: string): string {
    const d = new Date(iso);
    const date = d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const time = d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${date} ${time}`;
  }

  private applyNotifiedStatus(semanaId: string, ids: string[], notifiedAt?: string): void {
    if (!ids.length) return;
    const set = new Set(ids);
    this.senalamentosBySemana[semanaId] = (this.senalamentosBySemana[semanaId] || []).map(s => {
      if (!set.has(s.id)) return s;
      return {
        ...s,
        notificado: true,
        notificadoEn: notifiedAt || new Date().toISOString()
      };
    });
  }

  private applyNotifiedStatusById(ids: string[], notifiedAt?: string): void {
    if (!ids.length) return;
    const set = new Set(ids);
    Object.keys(this.senalamentosBySemana).forEach(semanaId => {
      this.senalamentosBySemana[semanaId] = (this.senalamentosBySemana[semanaId] || []).map(s => {
        if (!set.has(s.id)) return s;
        return {
          ...s,
          notificado: true,
          notificadoEn: notifiedAt || new Date().toISOString()
        };
      });
    });
  }

  private notify(msg: string, isError = false): void {
    this.snack.open(msg, 'Cerrar', {
      duration: 3500,
      panelClass: isError ? ['snack-error'] : ['snack-ok']
    });
  }
}
