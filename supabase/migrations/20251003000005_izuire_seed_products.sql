-- Izuire catalogue seed: the 12 listings the app ships with, written into
-- public.products so the home rail, the marketplace and the product pages are
-- all driven by the database (and editable from /admin) from the first run.
-- Prices are INTEGER kobo. `featured_rank` orders the home rail; `sort_rank`
-- orders the marketplace grid. `image` is a Cloudinary URL object.
insert into public.products
  (id, icon, badge, cat, name, title, ngn, rmb, unit, specs, moq,
   price_kobo, price_fen, unit_price, min_qty, featured, featured_rank, sort_rank, active, image, gallery)
values
  ('phone-screens-a-grade','screen','Best Selling','electronics','a-grade phone screens (assorted)','A-Grade Phone Screens (Assorted)','₦18,500','¥58','/ unit','Grades A/A+, multiple models','MOQ: 20 units',1850000,5800,18500,20,true,0,0,true,'{"src":"https://res.cloudinary.com/djdbcoyot/image/upload/c_limit,w_720,q_auto:good/v1790716688/wafeiy3hzjxpb3kigoyh.jpg","width":736,"height":981}'::jsonb,'[]'::jsonb),
  ('bluetooth-earbuds-oem','earbuds',null,'electronics','bluetooth earbuds (oem)','Bluetooth Earbuds (OEM)','₦6,200','¥19','/ unit','TWS, custom branding available','MOQ: 50 units',620000,1900,6200,50,false,0,1,true,'{"src":"https://res.cloudinary.com/djdbcoyot/image/upload/c_limit,w_720,q_auto:good/v1790717225/xmljkgwbxvran4uprx5y.jpg","width":425,"height":535}'::jsonb,'[]'::jsonb),
  ('okrika-mixed-bale-a','bale','Popular','okrika','okrika mixed bale, grade a','Okrika Mixed Bale, Grade A','₦185,000','¥580','/ bale','Adult mixed, top grade','MOQ: 1 bale (100kg)',18500000,58000,185000,1,true,1,2,true,'{"src":"https://res.cloudinary.com/djdbcoyot/image/upload/c_limit,w_720,q_auto:good/v1790717225/yqwubjvjgyutcmwbcn7d.jpg","width":720,"height":960}'::jsonb,'[]'::jsonb),
  ('okrika-childrens-wear-bale','bale',null,'okrika','okrika children''s wear bale','Okrika Children''s Wear Bale','₦150,000','¥470','/ bale','Ages 2-12, mixed','MOQ: 1 bale (100kg)',15000000,47000,150000,1,false,0,3,true,'{"src":"https://res.cloudinary.com/djdbcoyot/image/upload/c_limit,w_720,q_auto:good/v1790717225/hou9xyiuxrdixg5jcsd8.jpg","width":720,"height":960}'::jsonb,'[]'::jsonb),
  ('pvc-ceiling-panels','building','Hot Deal','building','pvc ceiling panels','PVC Ceiling Panels','₦3,400','¥10.7','/ panel','White, 60cm x 60cm','MOQ: 200 panels',340000,1070,3400,200,false,0,4,true,null,'[]'::jsonb),
  ('bathroom-fittings-set','building',null,'building','bathroom fittings set','Bathroom Fittings Set','₦22,000','¥69','/ set','Chrome finish','MOQ: 30 sets',2200000,6900,22000,30,false,0,5,true,null,'[]'::jsonb),
  ('raw-human-hair-bundles-20','hair','Best Selling','hair','raw human hair bundles, 20"','Raw Human Hair Bundles, 20"','₦38,000','¥120','/ bundle','Unprocessed, single donor','MOQ: 12 bundles',3800000,12000,38000,12,true,3,6,true,null,'[]'::jsonb),
  ('lace-front-wig-24','hair','New','hair','lace front wig, 24"','Lace Front Wig, 24"','₦64,000','¥200','/ unit','HD lace, pre-plucked','MOQ: 10 units',6400000,20000,64000,10,false,0,7,true,null,'[]'::jsonb),
  ('150w-solar-panel','sun','Popular','solar','150w solar panel (monocrystalline)','150W Solar Panel (Monocrystalline)','₦46,000','¥145','/ panel','12V, high-efficiency cells','MOQ: 10 panels',4600000,14500,46000,10,true,2,8,true,null,'[]'::jsonb),
  ('200ah-lithium-battery','battery','Hot Deal','solar','200ah lithium battery','200Ah Lithium Battery','₦285,000','¥895','/ unit','LiFePO4, 12V','MOQ: 5 units',28500000,89500,285000,5,false,0,9,true,null,'[]'::jsonb),
  ('ladies-sandles-assorted','sandal',null,'fashion','ladies sandals (assorted)','Ladies Sandals (Assorted)','₦3,200','¥10','/ pair','Mixed sizes 36-40','MOQ: 100 pairs',320000,1000,3200,100,false,0,10,true,null,'[]'::jsonb),
  ('stainless-cookware-set-10pc','pot','New','kitchen','stainless cookware set (10pc)','Stainless Cookware Set (10pc)','₦28,000','¥88','/ set','Induction-ready','MOQ: 20 sets',2800000,8800,28000,20,false,0,11,true,null,'[]'::jsonb)
on conflict (id) do update set
  icon = excluded.icon, badge = excluded.badge, cat = excluded.cat, name = excluded.name,
  title = excluded.title, ngn = excluded.ngn, rmb = excluded.rmb, unit = excluded.unit,
  specs = excluded.specs, moq = excluded.moq, price_kobo = excluded.price_kobo,
  price_fen = excluded.price_fen, unit_price = excluded.unit_price, min_qty = excluded.min_qty,
  featured = excluded.featured, featured_rank = excluded.featured_rank,
  sort_rank = excluded.sort_rank, active = excluded.active, image = excluded.image,
  gallery = excluded.gallery, updated_at = now();
