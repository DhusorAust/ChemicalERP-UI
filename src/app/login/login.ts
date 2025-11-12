// src/app/login/login.ts
import { Component, ViewEncapsulation, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';


@Component({
  standalone: true,
  selector: 'app-login', 
  templateUrl: './login.html',
  styleUrls: ['./login.css'],    // 👈 array
  encapsulation: ViewEncapsulation.None,
  imports: [NgIf, ReactiveFormsModule],

})
export class Login {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  loading = false;
  error = '';

  form = this.fb.group({
    UserName: ['', Validators.required],
    PasswordH: ['', Validators.required]
  });

// src/app/login/login.ts
submit() {
  if (this.form.invalid) { this.error = 'Input User ID & Password'; return; }
  this.loading = true; this.error = '';

  const u = encodeURIComponent(this.form.value.UserName!);
  const p = encodeURIComponent(this.form.value.PasswordH!);

  // DIRECT call to your API (no proxy):

  var apiBase = environment.apiBase;

  const url = `${apiBase}/api/login/getloginuser/${u}/${p}`; 

  this.http.get<any>(url, { withCredentials: true }).subscribe({
    next: async (res) => {
      this.loading = false;

      // Treat common shapes as success — tweak to match your API payload if needed
      console.log(res);
      const ok = !!res && (
        res.isCompleted === true ||
        res.authenticated === true ||
        !!res.UserID || !!res.UserName || !!res.user
      );

      if (ok) {
        // (Optional) set a local flag so your guard lets Home load immediately
        sessionStorage.setItem('isAuth', '1');
         
        // Go straight to Home
        this.router.navigateByUrl('/home', { replaceUrl: true });

        // If your API returns a redirect URL and you must follow it, do:
        // if (res.redirectUrl) window.location.href = res.redirectUrl;
      } else {
        this.error = res?.Message || 'Login failed';
      }
    },
    error: (err) => {
      this.loading = false;
      this.error = err?.message || 'Login error';
    }
  });
}

}
