import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Category } from '../../models/category.model';
import { CategoriesService } from '../../services/categories.service';
import { CategoryDialogComponent } from './category-dialog/category-dialog.component';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {
  displayedColumns = ['categoria', 'division', 'genero', 'grupoWhatsapp', 'acciones'];
  dataSource = new MatTableDataSource<Category>();
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private categoriesService: CategoriesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  load(): void {
    this.loading = true;
    this.categoriesService.getAll().subscribe({
      next: data => { this.dataSource.data = data; this.loading = false; },
      error: () => { this.loading = false; this.notify('Error al cargar las categorías', true); }
    });
  }

  applyFilter(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.dataSource.filter = val.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  openCreate(): void {
    this.dialog.open(CategoryDialogComponent, { width: '520px', data: {} })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.categoriesService.create(result).subscribe({
          next: () => { this.load(); this.notify('Categoría creada correctamente'); },
          error: err => this.notify(err.error?.error || 'Error al crear', true)
        });
      });
  }

  openEdit(cat: Category): void {
    this.dialog.open(CategoryDialogComponent, { width: '520px', data: { category: cat } })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.categoriesService.update(cat.id, result).subscribe({
          next: () => { this.load(); this.notify('Categoría actualizada'); },
          error: err => this.notify(err.error?.error || 'Error al actualizar', true)
        });
      });
  }

  confirmDelete(cat: Category): void {
    if (!confirm(`¿Eliminar la categoría "${cat.categoria}"?`)) return;
    this.categoriesService.delete(cat.id).subscribe({
      next: () => { this.load(); this.notify('Categoría eliminada'); },
      error: () => this.notify('Error al eliminar', true)
    });
  }

  private notify(msg: string, isError = false): void {
    this.snackBar.open(msg, 'Cerrar', {
      duration: 3500,
      panelClass: isError ? ['snack-error'] : ['snack-ok']
    });
  }
}
