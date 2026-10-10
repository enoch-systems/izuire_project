import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { CloudinaryMediaService } from '../../services/cloudinary-media.service';
import { parsePriceToKobo } from '../../services/money';

interface MediaDraft {
  src: string;
  file?: File;
}

/**
 * /admin/products, the catalogue manager.
 *
 * It writes through AdminAuthService's own client rather than the storefront's,
 * so the RLS `is_admin()` policies see the console session. Prices are held in
 * integer kobo so a price typed in cents is exact, the field only divides by
 * 100 for the reading.
 *
 * `sold_out` is read defensively: rows written before the migration carry no
 * column, and Supabase answers those selects with an error rather than nulls.
 * So a select that names it can fail the whole load, the loader retries
 * without it and every row reads as available.
 */
@Component({
  selector: 'app-admin-products',
  imports: [FormsModule],
  templateUrl: './admin-products.html',
  styles: [
    `:host{display:block;font-family:var(--font-b)}.kicker{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-d);font-weight:600;font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--orange-deep);margin:0 0 12px}.kicker::before{content:'';width:16px;height:2px;background:var(--orange-deep);display:inline-block}h1{font-family:var(--font-d);font-weight:700;letter-spacing:-0.01em;line-height:1.08;font-size:28px;margin:0 0 6px}.lede{margin:0 0 16px;font-size:0.86rem;line-height:1.6;color:var(--ink-60);max-width:62ch}.acts--head{margin-bottom:20px}.acts--head .btn-primary{flex:none}.flash{margin:0 0 20px;padding:10px 14px;font-size:13px;border-radius:10px;background:var(--verify-tint);border:1px solid var(--verify-line);color:var(--verify)}.flash--bad{background:rgba(180,40,40,0.07);border-color:rgba(180,40,40,0.24);color:#8a1c1c}:root[data-theme='dark'] .flash--bad{background:rgba(255,110,110,.12);border-color:rgba(255,110,110,.3);color:#ff9d9d}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media (min-width:720px){.cards{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}.pcard{background:var(--white);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:box-shadow 0.25s var(--ease)}.pcard:hover{box-shadow:0 18px 36px rgba(17,17,17,0.09);transform:translateY(-3px)}:root[data-theme='dark'] .pcard:hover{box-shadow:none}.pthumb{position:relative;aspect-ratio:1 / 0.86;background:var(--white);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:center;overflow:hidden}.pthumb img{width:100%;height:100%;object-fit:contain;padding:5%;display:block}.pthumb svg{width:42%;height:42%;stroke:var(--ink);opacity:0.24}.pcard.is-soldout .pthumb img{opacity:0.82}.pbadge{position:absolute;top:10px;left:10px;background:var(--orange);color:var(--white);font-family:var(--font-d);font-weight:600;font-size:0.6rem;letter-spacing:0.05em;text-transform:uppercase;padding:5px 10px;border-radius:999px;white-space:nowrap}.pbadge--soldout{background:var(--ink);color:var(--white);box-shadow:none}.pbadge--hidden{background:transparent;color:var(--ink-60);border:1px solid var(--line-strong);box-shadow:none}.pbody{padding:12px 12px 13px;display:flex;flex-direction:column;gap:6px;flex:1}.pbody h3{font-family:var(--font-d);font-weight:600;font-size:0.8rem;line-height:1.3;margin:0;overflow-wrap:anywhere;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.pprice{margin:0;font-family:var(--font-d);font-weight:700;font-size:1.02rem;overflow-wrap:anywhere}input[type='text'],textarea{touch-action:manipulation;width:100%;padding:10px 12px;font-family:var(--font-d);font-weight:500;font-size:16px;color:var(--ink);background:var(--white);border:1px solid var(--line);border-radius:7px}input[type='text']:focus,textarea:focus,select:focus{border-color:var(--orange);outline:none;outline:2px solid var(--orange)}button{font-family:var(--font-d);font-weight:600;font-size:13px;padding:10px 14px;border-radius:5px;cursor:pointer;white-space:nowrap;border:1.5px solid var(--ink);background:transparent;color:var(--ink);transition:background 0.22s var(--ease),color 0.22s var(--ease)}button:hover:not(:disabled){background:var(--ink);color:var(--white)}button:disabled{opacity:0.5;cursor:progress}button:focus-visible,input:focus-visible,select:focus-visible{outline:2.5px solid var(--orange-deep);outline-offset:2px}.btn-primary{background:var(--orange);color:var(--white);border-color:transparent;}.btn-primary:hover:not(:disabled){background:var(--orange-deep)}.acts{display:flex;gap:8px;margin-top:6px}.acts button{flex:1;padding:9px 6px;font-size:0.78rem}.empty{font-size:14px;line-height:1.7;color:var(--ink-60);background:var(--white);border:1px solid var(--line);border-radius:14px;padding:20px}`,
  ],
})
export class AdminProducts {
  private readonly admin = inject(AdminAuthService);
  private readonly media = inject(CloudinaryMediaService);
  private readonly router = inject(Router);

  protected readonly rows = signal<Record<string, unknown>[]>([]);
  protected readonly loading = signal(true);
  protected readonly flash = signal('');
  protected readonly flashBad = signal(false);
  protected readonly saving = signal(false);

  /** Six cards per page keeps the list compact; pager appears past one page. */
  private readonly pageSize = 6;
  protected readonly page = signal(0);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.rows().length / this.pageSize)),
  );
  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.pageCount() }, (_, i) => i),
  );
  protected readonly visible = computed(() => {
    const start = this.page() * this.pageSize;
    return this.rows().slice(start, start + this.pageSize);
  });

  /** Jump pages; clamps so a shrink in rows never strands the pager. */
  protected goToPage(index: number): void {
    this.page.set(Math.min(Math.max(index, 0), this.pageCount() - 1));
  }

  /** Which modal is open: null, the add form, or an edit form for a product id. */
  protected readonly modal = signal<null | { kind: 'add' } | { kind: 'edit'; id: string }>(null);
  /** Field drafts for the open modal (price shown in naira, the rest raw). */
  protected form: Record<string, string> = {};
  /** Toggles inside the open drawer: featured / sold out / hidden. */
  protected flags: { featured: boolean; soldOut: boolean; hidden: boolean } = {
    featured: false,
    soldOut: false,
    hidden: false,
  };
  /** Local previews for images picked in the open modal (object URLs + uploads). */
  protected formImages: MediaDraft[] = [];
  protected formVideos: MediaDraft[] = [];

  /** Badge words the shop cards know how to wear. */
  protected readonly badgeOptions = ['', 'Popular', 'Hot Deal', 'New', 'Best Selling'];

  /** Small right side editor for one product field at a time. */
  protected readonly fieldEdit = signal<'' | 'title' | 'price' | 'category' | 'unit' | 'minQty' | 'badge' | 'specs' | 'description' | 'moq'>('');
  protected readonly fieldValue = signal('');

  /** Back to the console dashboard. */
  protected goBack(): void {
    void this.router.navigateByUrl('/admin');
  }

  /** Open one small right side editor for a product field. */
  protected openField(field: 'title' | 'price' | 'category' | 'unit' | 'minQty' | 'badge' | 'specs' | 'description' | 'moq'): void {
    this.fieldEdit.set(field);
    this.fieldValue.set(this.form[field] ?? '');
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => document.getElementById('fieldEditInput')?.focus(), 60);
  }

  /** Keep the small editor's value as the admin types. */
  protected onFieldInput(value: string): void {
    this.fieldValue.set(value);
  }

  /** Apply the small editor into the draft and return to the main panel. */
  protected saveField(): void {
    const field = this.fieldEdit();
    if (field) this.form[field] = this.fieldValue();
    this.fieldEdit.set('');
    if (!this.modal()) document.body.style.overflow = '';
  }

  /** Discard the small editor without touching the draft. */
  protected cancelField(): void {
    this.fieldEdit.set('');
    if (!this.modal()) document.body.style.overflow = '';
  }

  /** Human title for the small right side editor. */
  protected fieldTitle(): string {
    switch (this.fieldEdit()) {
      case 'title':
        return 'Product name';
      case 'price':
        return 'Price';
      case 'category':
        return 'Category';
      case 'unit':
        return 'Unit label';
      case 'minQty':
        return 'Minimum quantity';
      case 'badge':
        return 'Badge';
      case 'specs':
        return 'Specs';
      case 'description':
        return 'Description';
      case 'moq':
        return 'MOQ note';
      default:
        return 'Edit';
    }
  }

  /** Hint line for the small right side editor. */
  protected fieldHint(): string {
    switch (this.fieldEdit()) {
      case 'title':
        return 'Keep it short and clear, commas are fine.';
      case 'price':
        return 'Numbers only, naira. Kobo stays exact.';
      case 'category':
        return 'For example, electronics, kitchenware or solar.';
      case 'unit':
        return 'For example, unit, pair, panel or set.';
      case 'minQty':
        return 'The smallest quantity a buyer can order.';
      case 'badge':
        return 'Pick None, Popular, Hot Deal, New or Best Selling.';
      case 'specs':
        return 'One short line, commas are fine.';
      case 'description':
        return 'A fuller product description for the public detail page.';
      case 'moq':
        return 'For example, 10 units or 1 bale.';
      default:
        return '';
    }
  }

  constructor() {
    void this.load();
  }

  /** The photo for the thumb, or null for icon-only listings. */
  protected imageSrc(row: Record<string, unknown>): string | null {
    const image = row['image'] as { src?: unknown } | null | undefined;
    return typeof image?.src === 'string' && image.src ? image.src : null;
  }

  /** Every stored shot for the modal strip: cover first, then gallery. */
  protected gallerySrcs(row: Record<string, unknown>): string[] {
    const out: string[] = [];
    const cover = this.imageSrc(row);
    if (cover) out.push(cover);
    const gallery = row['gallery'];
    if (Array.isArray(gallery)) {
      for (const shot of gallery) {
        const src = (shot as { src?: unknown } | null)?.src;
        if (typeof src === 'string' && src && !out.includes(src)) out.push(src);
      }
    }
    return out.slice(0, 6);
  }

  /** Naira reading for the card (kobo held exact, divided only for display). */
  protected displayPrice(row: Record<string, unknown>): string {
    return (Number(row['price_kobo'] ?? 0) / 100).toLocaleString('en-US');
  }

  /** Whether this row reads as sold out (missing column counts as available). */
  protected isSoldOut(row: Record<string, unknown>): boolean {
    return row['sold_out'] === true;
  }

  /** Whether this row is hidden from the shop entirely. */
  protected isHidden(row: Record<string, unknown>): boolean {
    return row['active'] === false;
  }

  /** Open the add-product modal: name + price + images only. */
  protected openAdd(): void {
    this.form = { title: '', price: '', category: '', unit: 'unit', minQty: '1', specs: '', description: '', moq: '', badge: '' };
    this.flags = { featured: false, soldOut: false, hidden: false };
    this.clearMedia();
    this.modal.set({ kind: 'add' });
    document.body.style.overflow = 'hidden';
  }

  /** Open the edit modal for a row; flags mirror the row's live state. */
  protected openEdit(row: Record<string, unknown>): void {
    const badge = String((row['badge'] as string) ?? '');
    this.form = {
      title: String(row['title'] ?? ''),
      price: String(Number(row['price_kobo'] ?? 0) / 100),
      category: String(row['cat'] ?? ''),
      unit: String(row['unit'] ?? '/ unit').replace(/^\s*\/\s*/, ''),
      minQty: String(row['min_qty'] ?? 1),
      specs: String(row['specs'] ?? ''),
      description: String(row['description'] ?? ''),
      moq: String(row['moq'] ?? ''),
      badge,
    };
    this.flags = {
      featured: row['featured'] === true,
      soldOut: this.isSoldOut(row),
      hidden: this.isHidden(row),
    };
    this.clearMedia();
    const existing = this.gallerySrcs(row);
    this.formImages = existing.map((src) => ({ src }));
    const videos = Array.isArray(row['videos']) ? (row['videos'] as { src?: unknown }[]) : [];
    this.formVideos = videos
      .map((video) => video.src)
      .filter((src): src is string => typeof src === 'string' && !!src)
      .map((src) => ({ src }));
    this.modal.set({ kind: 'edit', id: String(row['id']) });
    document.body.style.overflow = 'hidden';
  }

  protected closeModal(): void {
    this.fieldEdit.set('');
    this.modal.set(null);
    this.clearMedia();
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    // The small field drawer sits above the form drawer, so it goes first.
    if (this.fieldEdit()) this.cancelField();
    else if (this.modal()) this.closeModal();
  }

  /** Queue picked files as previews; uploads happen on submit. */
  protected pickImages(event: Event): void {
    const files = (event.target as HTMLInputElement | null)?.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) {
        this.notify(`${file.name} is larger than the 10 MB image limit.`, true);
        continue;
      }
      this.formImages = [...this.formImages, { src: URL.createObjectURL(file), file }].slice(0, 6);
    }
    (event.target as HTMLInputElement).value = '';
  }

  protected pickVideos(event: Event): void {
    const files = (event.target as HTMLInputElement | null)?.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/')) continue;
      if (file.size > 100 * 1024 * 1024) {
        this.notify(`${file.name} is larger than the 100 MB video limit.`, true);
        continue;
      }
      this.formVideos = [...this.formVideos, { src: URL.createObjectURL(file), file }].slice(0, 4);
    }
    (event.target as HTMLInputElement).value = '';
  }

  protected removeImage(index: number): void {
    const [gone] = this.formImages.splice(index, 1);
    if (gone?.file) URL.revokeObjectURL(gone.src);
    this.formImages = [...this.formImages];
  }

  protected removeVideo(index: number): void {
    const [gone] = this.formVideos.splice(index, 1);
    if (gone?.file) URL.revokeObjectURL(gone.src);
    this.formVideos = [...this.formVideos];
  }

  private clearMedia(): void {
    for (const img of this.formImages) if (img.file) URL.revokeObjectURL(img.src);
    for (const video of this.formVideos) if (video.file) URL.revokeObjectURL(video.src);
    this.formImages = [];
    this.formVideos = [];
  }

  protected setField(field: string, value: string): void {
    this.form = { ...this.form, [field]: value };
  }

  protected setFlag(flag: 'featured' | 'soldOut' | 'hidden', value: boolean): void {
    this.flags = { ...this.flags, [flag]: value };
  }

  protected draft(field: string): string {
    return this.form[field] ?? '';
  }

  /** Flags apply together with the fields on save, nothing lives on the card. */
  protected async submitModal(): Promise<void> {
    const m = this.modal();
    if (!m || this.saving()) return;
    const title = (this.form['title'] ?? '').trim();
    const category = (this.form['category'] ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const minQty = Math.max(1, Math.floor(Number(this.form['minQty']) || 0));
    if (!title || !category) {
      this.notify('Add a product name and category first.', true);
      return;
    }
    const kobo = parsePriceToKobo(this.form['price'] ?? '0');
    if (kobo < 1 || minQty < 1) {
      this.notify('Enter a price greater than zero and a valid minimum quantity.', true);
      return;
    }
    const badge = this.resolveBadge();
    let uploaded: Record<string, unknown> | undefined | null;
    try {
      uploaded = await this.uploadPickedMedia();
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Could not upload media.', true);
      return;
    }
    if (uploaded === null) return;
    const unitValue = (this.form['unit'] ?? '').trim().replace(/^\s*\/\s*/, '') || 'unit';
    const patch: Record<string, unknown> = {
      title,
      name: title.toLowerCase(),
      cat: category,
      price_kobo: kobo,
      unit_price: Math.round(kobo / 100),
      ngn: `₦${(kobo / 100).toLocaleString('en-US')}`,
      unit: `/ ${unitValue}`,
      min_qty: minQty,
      specs: (this.form['specs'] ?? '').trim(),
      description: (this.form['description'] ?? '').trim(),
      moq: (this.form['moq'] ?? '').trim(),
      badge,
      featured: this.flags.featured,
      active: !this.flags.hidden,
      sold_out: this.flags.soldOut,
    };
    if (uploaded) Object.assign(patch, uploaded);
    try {
      if (m.kind === 'add') await this.create(patch);
      else await this.patch(m.id, patch);
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Could not save the product.', true);
      return;
    }
    if (!this.flashBad()) this.closeModal();
  }

  /** The badge chosen in the side editor; empty means no badge at all. */
  private resolveBadge(): string | null {
    const raw = (this.form['badge'] ?? '').trim();
    return raw === '' ? null : raw;
  }

  /** Upload new Cloudinary media; preserve existing assets not removed in the form. */
  private async uploadPickedMedia(): Promise<Record<string, unknown> | undefined> {
    const existingImages = this.formImages.filter((item) => !item.file).map((item) => item.src);
    const uploadedImages = await Promise.all(
      this.formImages.filter((item) => item.file).map((item) => this.media.upload(item.file!)),
    );
    const images = [
      ...existingImages,
      ...uploadedImages.map((asset) => ({
        src: asset.src,
        width: asset.width ?? 720,
        height: asset.height ?? 900,
      })),
    ];
    const existingVideos = this.formVideos.filter((item) => !item.file).map((item) => ({ src: item.src }));
    const uploadedVideos = await Promise.all(
      this.formVideos.filter((item) => item.file).map((item) => this.media.upload(item.file!)),
    );
    const videos = [...existingVideos, ...uploadedVideos.map((asset) => ({ src: asset.src, duration: asset.duration }))];
    if (!images.length && !videos.length && this.modal()?.kind !== 'edit') return undefined;
    return {
      image: images[0] ?? null,
      gallery: images.slice(1),
      videos,
    };
  }

  /** Insert a new row; id + sort slot derived so the insert is self-contained. */
  private async create(patch: Record<string, unknown>): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const title = String(patch['title'] ?? 'product');
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
      const id = `${slug || 'product'}-${Date.now().toString(36)}`;
      const maxRank = this.rows().reduce(
        (max, r) => Math.max(max, Number(r['sort_rank'] ?? 0) || 0),
        -1,
      );
      const maxFeaturedRank = this.rows().reduce(
        (max, row) => Math.max(max, Number(row['featured_rank'] ?? 0) || 0),
        -1,
      );
      const { error } = await this.admin.supabase.from('products').insert({
        id,
        icon: 'box',
        cat: String(patch['cat'] ?? 'general'),
        name: title.toLowerCase(),
        title,
        ngn: '',
        rmb: '',
        unit: '/ unit',
        specs: '',
        description: '',
        moq: '',
        price_fen: 0,
        min_qty: 1,
        featured_rank: patch['featured'] ? maxFeaturedRank + 1 : 0,
        sort_rank: maxRank + 1,
        gallery: [],
        ...patch,
      });
      if (error) throw error;
      this.notify('Product added.');
      await this.load();
    } catch (e) {
      this.notify(e instanceof Error ? e.message : 'Could not save.', true);
      throw e;
    } finally {
      this.saving.set(false);
    }
  }

  private async patch(id: string, patch: Record<string, unknown>): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const { error } = await this.admin.supabase.from('products').update(patch).eq('id', id);
      if (error) throw error;
      this.notify('Saved.');
      await this.load();
    } catch (e) {
      this.notify(e instanceof Error ? e.message : 'Could not save.', true);
      throw e;
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const full = await this.admin.supabase
        .from('products')
        .select('id,title,price_kobo,featured,featured_rank,active,sold_out,cat,specs,description,moq,badge,image,gallery,videos,unit,min_qty')
        .order('sort_rank', { ascending: true });
      if (full.error) throw full.error;
      this.rows.set((full.data as Record<string, unknown>[]) ?? []);
    } catch {
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private notify(message: string, bad = false): void {
    this.flash.set(message);
    this.flashBad.set(bad);
    setTimeout(() => this.flash.set(''), 2600);
  }
}