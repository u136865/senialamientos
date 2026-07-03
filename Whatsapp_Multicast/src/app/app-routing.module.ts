import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CategoriesComponent } from './components/categories/categories.component';
import { SenalamentosComponent } from './components/senalamentos/senalamentos.component';

const routes: Routes = [
  { path: 'categorias', component: CategoriesComponent },
  { path: 'senalamentos', component: SenalamentosComponent },
  { path: '', redirectTo: 'senalamentos', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
