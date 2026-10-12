begin;

update public.products
set image = jsonb_build_object(
  'src', image #>> '{}',
  'width', 720,
  'height', 900
)
where jsonb_typeof(image) = 'string';

update public.products p
set gallery = (
  select coalesce(
    jsonb_agg(
      case
        when jsonb_typeof(media.item) = 'string' then jsonb_build_object(
          'src', media.item #>> '{}',
          'width', 720,
          'height', 900
        )
        when jsonb_typeof(media.item) = 'object' then jsonb_build_object(
          'src', media.item -> 'src',
          'width', case
            when jsonb_typeof(media.item -> 'width') = 'number' and (media.item ->> 'width')::numeric > 0
              then media.item -> 'width'
            else '720'::jsonb
          end,
          'height', case
            when jsonb_typeof(media.item -> 'height') = 'number' and (media.item ->> 'height')::numeric > 0
              then media.item -> 'height'
            else '900'::jsonb
          end
        )
        else media.item
      end
      order by media.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p.gallery) with ordinality as media(item, ordinality)
)
where jsonb_typeof(p.gallery) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(p.gallery) as media(item)
    where jsonb_typeof(media.item) = 'string'
      or (jsonb_typeof(media.item) = 'object' and (
        jsonb_typeof(media.item -> 'width') is distinct from 'number'
        or jsonb_typeof(media.item -> 'height') is distinct from 'number'
      ))
  );

update public.products p
set videos = (
  select coalesce(
    jsonb_agg(
      case
        when jsonb_typeof(video.item) = 'string' then jsonb_build_object('src', video.item #>> '{}')
        else video.item
      end
      order by video.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p.videos) with ordinality as video(item, ordinality)
)
where jsonb_typeof(p.videos) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(p.videos) as video(item)
    where jsonb_typeof(video.item) = 'string'
  );

commit;
