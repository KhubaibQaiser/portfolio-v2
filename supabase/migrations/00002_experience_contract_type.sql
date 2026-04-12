-- Job arrangement (employment type) for work history rows.
alter table public.experience
  add column contract_type text not null default 'full_time'
    check (
      contract_type in (
        'full_time',
        'part_time',
        'contract',
        'freelance',
        'internship'
      )
    );

comment on column public.experience.contract_type is 'Employment or engagement type (e.g. full-time, contract).';
