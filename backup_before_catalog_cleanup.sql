--
-- PostgreSQL database dump
--

\restrict HtBfby4M4umxxo4H3x0oQTRLPXa1ByTC0IPTI8YZythJWRE3ExiCW3p8oqcGrsA

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AuditActorType; Type: TYPE; Schema: public; Owner: xlayout_user
--

CREATE TYPE public."AuditActorType" AS ENUM (
    'PLATFORM_USER',
    'COMPANY_USER',
    'DISTRIBUTOR_USER',
    'END_USER',
    'SYSTEM'
);


ALTER TYPE public."AuditActorType" OWNER TO xlayout_user;

--
-- Name: CompanyUserRole; Type: TYPE; Schema: public; Owner: xlayout_user
--

CREATE TYPE public."CompanyUserRole" AS ENUM (
    'TENANT_ADMIN',
    'BUSINESS_OWNER',
    'CATALOG_MANAGER',
    'SALES_USER'
);


ALTER TYPE public."CompanyUserRole" OWNER TO xlayout_user;

--
-- Name: DistributorUserRole; Type: TYPE; Schema: public; Owner: xlayout_user
--

CREATE TYPE public."DistributorUserRole" AS ENUM (
    'DISTRIBUTOR_ADMIN',
    'DESIGNER',
    'SALES'
);


ALTER TYPE public."DistributorUserRole" OWNER TO xlayout_user;

--
-- Name: ImportJobStatus; Type: TYPE; Schema: public; Owner: xlayout_user
--

CREATE TYPE public."ImportJobStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE public."ImportJobStatus" OWNER TO xlayout_user;

--
-- Name: MarkupScope; Type: TYPE; Schema: public; Owner: xlayout_user
--

CREATE TYPE public."MarkupScope" AS ENUM (
    'GLOBAL',
    'BY_TENANT',
    'BY_LINE',
    'BY_PRODUCT'
);


ALTER TYPE public."MarkupScope" OWNER TO xlayout_user;

--
-- Name: PlatformRole; Type: TYPE; Schema: public; Owner: xlayout_user
--

CREATE TYPE public."PlatformRole" AS ENUM (
    'PLATFORM_OWNER',
    'PLATFORM_ADMIN'
);


ALTER TYPE public."PlatformRole" OWNER TO xlayout_user;

--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: xlayout_user
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);


ALTER TYPE public."ProductStatus" OWNER TO xlayout_user;

--
-- Name: TenantStatus; Type: TYPE; Schema: public; Owner: xlayout_user
--

CREATE TYPE public."TenantStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'PENDING'
);


ALTER TYPE public."TenantStatus" OWNER TO xlayout_user;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: xlayout_user
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);


ALTER TYPE public."UserStatus" OWNER TO xlayout_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activation_codes; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.activation_codes (
    id text NOT NULL,
    tenant_id text NOT NULL,
    code text NOT NULL,
    catalog_enabled boolean DEFAULT true NOT NULL,
    prices_enabled boolean DEFAULT false NOT NULL,
    conditions_enabled boolean DEFAULT false NOT NULL,
    max_uses integer,
    used_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp(3) without time zone,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.activation_codes OWNER TO xlayout_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    actor_type public."AuditActorType" NOT NULL,
    actor_id text NOT NULL,
    tenant_id text,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    payload jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO xlayout_user;

--
-- Name: brands; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.brands (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "logoUrl" text,
    tenant_id text NOT NULL
);


ALTER TABLE public.brands OWNER TO xlayout_user;

--
-- Name: catalog_accesses; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.catalog_accesses (
    id text NOT NULL,
    tenant_id text NOT NULL,
    end_user_id text NOT NULL,
    catalog_enabled boolean DEFAULT true NOT NULL,
    prices_enabled boolean DEFAULT false NOT NULL,
    conditions_enabled boolean DEFAULT false NOT NULL,
    activated_by_user_id text,
    activation_code_id text,
    active boolean DEFAULT true NOT NULL,
    activated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone
);


ALTER TABLE public.catalog_accesses OWNER TO xlayout_user;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.companies (
    id text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.companies OWNER TO xlayout_user;

--
-- Name: company_brand_access; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.company_brand_access (
    company_id text NOT NULL,
    brand_id text NOT NULL,
    "grantedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.company_brand_access OWNER TO xlayout_user;

--
-- Name: company_price_lists; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.company_price_lists (
    tenant_id text NOT NULL,
    price_list_id text NOT NULL
);


ALTER TABLE public.company_price_lists OWNER TO xlayout_user;

--
-- Name: company_users; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.company_users (
    id text NOT NULL,
    tenant_id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role public."CompanyUserRole" DEFAULT 'CATALOG_MANAGER'::public."CompanyUserRole" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    preferences jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.company_users OWNER TO xlayout_user;

--
-- Name: discount_rules; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.discount_rules (
    id text NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    "strategyType" text NOT NULL,
    "configPayload" jsonb NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.discount_rules OWNER TO xlayout_user;

--
-- Name: distributor_catalog_accesses; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.distributor_catalog_accesses (
    id text NOT NULL,
    distributor_id text NOT NULL,
    tenant_id text NOT NULL,
    price_list_type text DEFAULT 'A'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    granted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.distributor_catalog_accesses OWNER TO xlayout_user;

--
-- Name: distributor_companies; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.distributor_companies (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    contact_email text,
    phone text,
    country text,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.distributor_companies OWNER TO xlayout_user;

--
-- Name: distributor_price_markups; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.distributor_price_markups (
    id text NOT NULL,
    distributor_id text NOT NULL,
    scope public."MarkupScope" DEFAULT 'GLOBAL'::public."MarkupScope" NOT NULL,
    tenant_id text,
    product_line_id text,
    product_id text,
    markup_percent numeric(8,4) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.distributor_price_markups OWNER TO xlayout_user;

--
-- Name: distributor_users; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.distributor_users (
    id text NOT NULL,
    distributor_id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role public."DistributorUserRole" DEFAULT 'DESIGNER'::public."DistributorUserRole" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    preferences jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.distributor_users OWNER TO xlayout_user;

--
-- Name: end_users; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.end_users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    company_name text,
    profession text,
    country text,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    preferences jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.end_users OWNER TO xlayout_user;

--
-- Name: import_jobs; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.import_jobs (
    id text NOT NULL,
    tenant_id text NOT NULL,
    type text NOT NULL,
    filename text NOT NULL,
    status public."ImportJobStatus" DEFAULT 'PENDING'::public."ImportJobStatus" NOT NULL,
    summary jsonb,
    created_by_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.import_jobs OWNER TO xlayout_user;

--
-- Name: manufacturer_distributor_accesses; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.manufacturer_distributor_accesses (
    id text NOT NULL,
    tenant_id text NOT NULL,
    distributor_id text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    granted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone,
    notes text
);


ALTER TABLE public.manufacturer_distributor_accesses OWNER TO xlayout_user;

--
-- Name: openings; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.openings (
    id text NOT NULL,
    project_version_id text NOT NULL,
    wall_id text NOT NULL,
    type text NOT NULL,
    position_x double precision NOT NULL,
    width double precision NOT NULL,
    height double precision NOT NULL
);


ALTER TABLE public.openings OWNER TO xlayout_user;

--
-- Name: placements; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.placements (
    id text NOT NULL,
    project_version_id text NOT NULL,
    room_id text,
    product_id text NOT NULL,
    pos_x double precision NOT NULL,
    pos_y double precision NOT NULL,
    pos_z double precision NOT NULL,
    rot_x double precision NOT NULL,
    rot_y double precision NOT NULL,
    rot_z double precision NOT NULL
);


ALTER TABLE public.placements OWNER TO xlayout_user;

--
-- Name: platform_users; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.platform_users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role public."PlatformRole" DEFAULT 'PLATFORM_ADMIN'::public."PlatformRole" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    preferences jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.platform_users OWNER TO xlayout_user;

--
-- Name: price_list_items; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.price_list_items (
    price_list_id text NOT NULL,
    product_id_legacy text NOT NULL,
    price numeric(10,2) NOT NULL
);


ALTER TABLE public.price_list_items OWNER TO xlayout_user;

--
-- Name: price_lists; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.price_lists (
    id text NOT NULL,
    name text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.price_lists OWNER TO xlayout_user;

--
-- Name: product_assets; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.product_assets (
    id text NOT NULL,
    tenant_id text NOT NULL,
    product_id text,
    "assetType" text NOT NULL,
    file_url text,
    thumbnail_url text,
    footprint_2d_url text,
    model_3d_url text,
    original_file_url text,
    original_format text,
    conversion_status text DEFAULT 'pending'::text NOT NULL,
    conversion_error text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.product_assets OWNER TO xlayout_user;

--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.product_categories (
    id text NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    parent_id text,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.product_categories OWNER TO xlayout_user;

--
-- Name: product_conditions; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.product_conditions (
    id text NOT NULL,
    tenant_id text NOT NULL,
    product_id text,
    line_id text,
    condition_type text NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.product_conditions OWNER TO xlayout_user;

--
-- Name: product_lines; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.product_lines (
    id text NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    category text,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.product_lines OWNER TO xlayout_user;

--
-- Name: product_prices; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.product_prices (
    id text NOT NULL,
    tenant_id text NOT NULL,
    product_id text NOT NULL,
    price_type text DEFAULT 'A'::text NOT NULL,
    currency text DEFAULT 'MXN'::text NOT NULL,
    base_price numeric(12,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    valid_from timestamp(3) without time zone,
    valid_to timestamp(3) without time zone,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.product_prices OWNER TO xlayout_user;

--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.product_variants (
    id text NOT NULL,
    product_id text NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    variant_type text NOT NULL,
    sku text,
    metadata jsonb,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.product_variants OWNER TO xlayout_user;

--
-- Name: products; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.products (
    id text NOT NULL,
    tenant_id text NOT NULL,
    line_id text NOT NULL,
    category_id text,
    sku text NOT NULL,
    name text NOT NULL,
    description text,
    width double precision NOT NULL,
    depth double precision NOT NULL,
    height double precision NOT NULL,
    active boolean DEFAULT true NOT NULL,
    status public."ProductStatus" DEFAULT 'DRAFT'::public."ProductStatus" NOT NULL,
    metadata jsonb
);


ALTER TABLE public.products OWNER TO xlayout_user;

--
-- Name: project_versions; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.project_versions (
    id text NOT NULL,
    project_id text NOT NULL,
    "versionNum" integer NOT NULL,
    scene_state_json jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    save_mode text DEFAULT 'autosave'::text NOT NULL,
    scene_hash text,
    summary jsonb
);


ALTER TABLE public.project_versions OWNER TO xlayout_user;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.projects (
    id text NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    description text,
    price_type text DEFAULT 'A'::text NOT NULL,
    creator_id text NOT NULL,
    client_company text,
    client_name text,
    commercial_status text DEFAULT 'Prospecto'::text NOT NULL,
    contact_email text,
    contact_name text,
    contact_phone text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    due_date timestamp(3) without time zone,
    estimated_value numeric(12,2),
    final_value numeric(12,2),
    operational_status text DEFAULT 'Sin iniciar'::text NOT NULL,
    priority text DEFAULT 'Media'::text NOT NULL,
    probability integer,
    project_code text,
    source text,
    tags jsonb,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.projects OWNER TO xlayout_user;

--
-- Name: quotes; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.quotes (
    id text NOT NULL,
    tenant_id text NOT NULL,
    project_version_id text NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    total_pieces integer DEFAULT 0 NOT NULL,
    price_type text DEFAULT 'A'::text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "quoteData" jsonb NOT NULL,
    creator_id text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.quotes OWNER TO xlayout_user;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.roles (
    id text NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO xlayout_user;

--
-- Name: rooms; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.rooms (
    id text NOT NULL,
    project_version_id text NOT NULL,
    name text,
    area_square_meters double precision,
    "dataJson" jsonb
);


ALTER TABLE public.rooms OWNER TO xlayout_user;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.tenants (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    status public."TenantStatus" DEFAULT 'PENDING'::public."TenantStatus" NOT NULL,
    logo_url text,
    contact_email text,
    created_by_id text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tenants OWNER TO xlayout_user;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.user_roles (
    user_id text NOT NULL,
    role_id text NOT NULL
);


ALTER TABLE public.user_roles OWNER TO xlayout_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    tenant_id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO xlayout_user;

--
-- Name: walls; Type: TABLE; Schema: public; Owner: xlayout_user
--

CREATE TABLE public.walls (
    id text NOT NULL,
    project_version_id text NOT NULL,
    room_id text,
    start_x double precision NOT NULL,
    start_y double precision NOT NULL,
    end_x double precision NOT NULL,
    end_y double precision NOT NULL,
    thickness double precision NOT NULL,
    height double precision NOT NULL
);


ALTER TABLE public.walls OWNER TO xlayout_user;

--
-- Data for Name: activation_codes; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.activation_codes (id, tenant_id, code, catalog_enabled, prices_enabled, conditions_enabled, max_uses, used_count, expires_at, active, created_at) FROM stdin;
84d150d9-9aae-4f63-b33f-7c6f58b40da4	843c9ed9-5fce-4111-9839-34949786bed8	PMLAPIEDAD-DEMO	t	t	f	100	0	\N	t	2026-03-25 04:23:38.14
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.audit_logs (id, actor_type, actor_id, tenant_id, action, entity_type, entity_id, payload, created_at) FROM stdin;
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.brands (id, name, description, "logoUrl", tenant_id) FROM stdin;
\.


--
-- Data for Name: catalog_accesses; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.catalog_accesses (id, tenant_id, end_user_id, catalog_enabled, prices_enabled, conditions_enabled, activated_by_user_id, activation_code_id, active, activated_at, expires_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.companies (id, name, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: company_brand_access; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.company_brand_access (company_id, brand_id, "grantedAt") FROM stdin;
\.


--
-- Data for Name: company_price_lists; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.company_price_lists (tenant_id, price_list_id) FROM stdin;
\.


--
-- Data for Name: company_users; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.company_users (id, tenant_id, email, password_hash, first_name, last_name, role, status, preferences, created_at, updated_at) FROM stdin;
91fe865b-eb59-4b28-a861-e6330fee9826	843c9ed9-5fce-4111-9839-34949786bed8	admin@pmlapiedad.com	$2a$10$4W0uIH5.q72wdf7FIh6YFem97ov6g/fxakM6i6YLMotPI5YNOfrru	Admin	PM La Piedad	TENANT_ADMIN	ACTIVE	\N	2026-03-25 04:23:37.898	2026-03-27 01:53:47.079
87bef96f-0286-4995-a05f-ec1ca6715765	b0a521ce-a8f0-4a63-997d-911c06aa7495	admin@demobrand.io	$2a$10$CuEDSii7VNqN9ir6MApWHuucUnGuGlllGPMY8ab7AG1osbE.3IfpO	Admin	Demo Brand	TENANT_ADMIN	ACTIVE	\N	2026-03-25 04:23:38.075	2026-03-27 01:53:47.262
d19e8e60-fca2-4498-a210-8c3d48808f31	ad434e3f-b929-4ff4-a80d-11feac16b136	jx.granados@pmlapiedad.com	$2a$10$r4VTQtFolgSbd621QH1azuiBSlGkP.2J6c6v/icmAft3jpqI5w6pS	Xocotzin	Granados	TENANT_ADMIN	ACTIVE	\N	2026-03-27 01:54:35.809	2026-03-27 01:54:35.809
\.


--
-- Data for Name: discount_rules; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.discount_rules (id, tenant_id, name, "strategyType", "configPayload", priority, active) FROM stdin;
\.


--
-- Data for Name: distributor_catalog_accesses; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.distributor_catalog_accesses (id, distributor_id, tenant_id, price_list_type, active, granted_at) FROM stdin;
a12bfe01-5252-4a10-a9c5-59879e7b14e0	409ac438-b74f-465e-8aff-92fde52d70c3	ad434e3f-b929-4ff4-a80d-11feac16b136	A	t	2026-03-27 01:55:37.103
\.


--
-- Data for Name: distributor_companies; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.distributor_companies (id, name, slug, contact_email, phone, country, status, metadata, created_at, updated_at) FROM stdin;
409ac438-b74f-465e-8aff-92fde52d70c3	PEME	peme	jx.granados@peme.mx	+523525259090	MX	ACTIVE	\N	2026-03-27 01:55:29.921	2026-03-27 01:55:29.921
\.


--
-- Data for Name: distributor_price_markups; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.distributor_price_markups (id, distributor_id, scope, tenant_id, product_line_id, product_id, markup_percent, active, priority, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: distributor_users; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.distributor_users (id, distributor_id, email, password_hash, first_name, last_name, role, status, preferences, created_at, updated_at) FROM stdin;
0464a0e6-8763-46fb-927b-119fbfc0d30c	409ac438-b74f-465e-8aff-92fde52d70c3	test-designer-1@peme.mx	$2a$10$N8R7uYMO1ONQK6QgsueA/eHq9k/TSgzq3MKm2NVkwrlB0w.tC6a4y	Test	Designer	DESIGNER	ACTIVE	\N	2026-03-27 02:07:33.846	2026-03-27 02:07:33.846
0650b7ab-ee0d-4a02-88db-ae714f839639	409ac438-b74f-465e-8aff-92fde52d70c3	diseña@pmlapiedad.com	$2a$10$XlISV4pzBz.ZueyJWjJmH.G25WvGMvUmt5jf350B61AgSW2zvnvsG	Xocotzin	Granados	DESIGNER	ACTIVE	\N	2026-03-27 02:48:28.599	2026-03-27 02:48:28.599
\.


--
-- Data for Name: end_users; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.end_users (id, email, password_hash, first_name, last_name, phone, company_name, profession, country, status, preferences, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: import_jobs; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.import_jobs (id, tenant_id, type, filename, status, summary, created_by_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: manufacturer_distributor_accesses; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.manufacturer_distributor_accesses (id, tenant_id, distributor_id, active, granted_at, expires_at, notes) FROM stdin;
6bc5a637-df3e-4b09-b6b1-f82e28be9364	ad434e3f-b929-4ff4-a80d-11feac16b136	409ac438-b74f-465e-8aff-92fde52d70c3	t	2026-03-27 01:55:37.068	\N	
\.


--
-- Data for Name: openings; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.openings (id, project_version_id, wall_id, type, position_x, width, height) FROM stdin;
\.


--
-- Data for Name: placements; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.placements (id, project_version_id, room_id, product_id, pos_x, pos_y, pos_z, rot_x, rot_y, rot_z) FROM stdin;
gi096icyq	7550be06-3a79-4ef3-b99a-6c0d94109928	\N	fb2a964a-2c4b-4521-9515-f4c734e8565c	0	0	0	0	0	0
kpeu51fed	7550be06-3a79-4ef3-b99a-6c0d94109928	\N	abb900bc-ac69-43f5-a10d-54c0fee97a29	0	0	0	0	0	0
y9mkz0hgt	7550be06-3a79-4ef3-b99a-6c0d94109928	\N	abb900bc-ac69-43f5-a10d-54c0fee97a29	0.5	0	0.5	0	0	0
j3bninyzr	df56185e-e19b-423f-92c9-39694c3b92af	\N	fb2a964a-2c4b-4521-9515-f4c734e8565c	3.25	0	0.375	0	0	0
3pqcwf7ug	df56185e-e19b-423f-92c9-39694c3b92af	\N	abb900bc-ac69-43f5-a10d-54c0fee97a29	3.25	0	1.625	0	0	0
omxz9aq6u	df56185e-e19b-423f-92c9-39694c3b92af	\N	abb900bc-ac69-43f5-a10d-54c0fee97a29	3.75	0	0.875	0	0	0
item1	4579730a-28a9-42df-ad19-28a27cc8bb99	\N	prod1	0	0	0	0	0	0
12l8axb4b	4d4b962f-9610-4c6f-b2ba-8a465e951e39	\N	1a8df8c7-601e-44fb-9037-82c7adf63b60	0	0	0	0	0	0
it10tugry	b0d97be3-b404-4454-844e-88e740f726f3	\N	fb2a964a-2c4b-4521-9515-f4c734e8565c	0	0	0	0	0	0
y1rg0kyct	f736d976-4d37-4190-811b-fb7b75b6e9a4	\N	1a8df8c7-601e-44fb-9037-82c7adf63b60	0	0	0	0	0	0
sm32nflqn	f736d976-4d37-4190-811b-fb7b75b6e9a4	\N	fb2a964a-2c4b-4521-9515-f4c734e8565c	0	0	0	0	0	0
\.


--
-- Data for Name: platform_users; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.platform_users (id, email, password_hash, first_name, last_name, role, status, preferences, created_at, updated_at) FROM stdin;
00d6c278-f539-4a6c-9ca2-1ac75cb8a8ff	xocotzin@xlayout.io	$2a$10$N9jUJRnnhU3jM0JbFt8PguWXip71k6yvBtGCPNeIQV5.ojlkU5.h.	Xocotzin	Platform	PLATFORM_OWNER	ACTIVE	\N	2026-03-25 04:23:37.684	2026-03-27 01:53:46.88
\.


--
-- Data for Name: price_list_items; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.price_list_items (price_list_id, product_id_legacy, price) FROM stdin;
\.


--
-- Data for Name: price_lists; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.price_lists (id, name, currency, "createdAt") FROM stdin;
\.


--
-- Data for Name: product_assets; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.product_assets (id, tenant_id, product_id, "assetType", file_url, thumbnail_url, footprint_2d_url, model_3d_url, original_file_url, original_format, conversion_status, conversion_error, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: product_categories; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.product_categories (id, tenant_id, name, slug, parent_id, active) FROM stdin;
\.


--
-- Data for Name: product_conditions; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.product_conditions (id, tenant_id, product_id, line_id, condition_type, description, metadata, active, created_at) FROM stdin;
\.


--
-- Data for Name: product_lines; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.product_lines (id, tenant_id, name, slug, category, description, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: product_prices; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.product_prices (id, tenant_id, product_id, price_type, currency, base_price, active, valid_from, valid_to, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.product_variants (id, product_id, tenant_id, name, variant_type, sku, metadata, active, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.products (id, tenant_id, line_id, category_id, sku, name, description, width, depth, height, active, status, metadata) FROM stdin;
\.


--
-- Data for Name: project_versions; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.project_versions (id, project_id, "versionNum", scene_state_json, "createdAt", save_mode, scene_hash, summary) FROM stdin;
7550be06-3a79-4ef3-b99a-6c0d94109928	af44d62e-9013-4c9d-9d43-7150b485068a	1	{"faces": [], "items": [{"id": "gi096icyq", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [0, 0, 0], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "kpeu51fed", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [0, 0, 0], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "y9mkz0hgt", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [0.5, 0, 0.5], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-27 04:41:05.479	autosave	\N	\N
1e26de7b-846a-4b57-a30a-25712d8a1c93	36b6ba7b-4b64-4171-9ab1-375c14d277e9	1	{"faces": [], "items": [{"id": "gi096icyq", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [0, 0, 0], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "kpeu51fed", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [0, 0, 0], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "y9mkz0hgt", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [0.5, 0, 0.5], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-27 04:41:21.568	autosave	\N	\N
95d9aa50-7dfd-45c4-a661-8fc27609ca35	af44d62e-9013-4c9d-9d43-7150b485068a	2	{"faces": [], "items": [{"id": "gi096icyq", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.75, 0, -0.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "kpeu51fed", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.75, 0, 1.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "y9mkz0hgt", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.25, 0, 0.375], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "j3bninyzr", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 0.375], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "3pqcwf7ug", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 1.625], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "omxz9aq6u", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.75, 0, 0.875], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "i3ej31p5f", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-0.25, 0, 1.875], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "saykn9ab7", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-0.25, 0, 3.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "362e2abhp", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [0.25, 0, 2.375], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-27 04:43:01.214	autosave	\N	\N
c0ae1046-07bf-46fa-a4a0-ca45b8ec849c	af44d62e-9013-4c9d-9d43-7150b485068a	3	{"faces": [], "items": [{"id": "gi096icyq", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.75, 0, -0.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "kpeu51fed", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.75, 0, 1.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "y9mkz0hgt", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.25, 0, 0.375], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "j3bninyzr", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 0.375], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "3pqcwf7ug", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 1.625], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "omxz9aq6u", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.75, 0, 0.875], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "i3ej31p5f", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-0.25, 0, 1.875], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "saykn9ab7", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-0.25, 0, 3.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "362e2abhp", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [0.25, 0, 2.375], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-27 04:43:05.075	autosave	\N	\N
6e3be66b-c46c-4f53-9838-7b7ed306ff27	af44d62e-9013-4c9d-9d43-7150b485068a	4	{"faces": [], "items": [{"id": "gi096icyq", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.75, 0, -0.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "kpeu51fed", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.75, 0, 1.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "j3bninyzr", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 0.375], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "3pqcwf7ug", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 1.625], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "omxz9aq6u", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.75, 0, 0.875], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-27 04:43:24.887	autosave	\N	\N
fd85db8c-a297-40bc-a6b8-98908a62cd14	af44d62e-9013-4c9d-9d43-7150b485068a	5	{"faces": [], "items": [{"id": "gi096icyq", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.75, 0, -0.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "kpeu51fed", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.75, 0, 1.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "j3bninyzr", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 0.375], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "3pqcwf7ug", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 1.625], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "omxz9aq6u", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.75, 0, 0.875], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-27 04:43:25.817	autosave	\N	\N
93735911-0073-4ef4-9b95-c89c89287560	cb80999d-132a-4cdc-a5f2-329e18a98250	1	{"faces": [], "items": [{"id": "gi096icyq", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.75, 0, -0.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "kpeu51fed", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [-1.75, 0, 1.125], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "j3bninyzr", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 0.375], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "3pqcwf7ug", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 1.625], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "omxz9aq6u", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.75, 0, 0.875], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-27 04:43:50.07	autosave	\N	\N
df56185e-e19b-423f-92c9-39694c3b92af	af44d62e-9013-4c9d-9d43-7150b485068a	6	{"faces": [], "items": [{"id": "j3bninyzr", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 0.375], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "3pqcwf7ug", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 1.625], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "omxz9aq6u", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.75, 0, 0.875], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-27 04:43:59.894	autosave	\N	\N
4579730a-28a9-42df-ad19-28a27cc8bb99	d560b37f-6412-49fa-9ff9-7966205e9c9e	1	{"items": [{"id": "item1", "position": [0, 0, 0], "rotation": [0, 0, 0], "productId": "prod1"}], "walls": [], "openings": []}	2026-03-27 04:45:47.669	autosave	\N	\N
7de6a696-7101-4d4d-a529-af624cffb7d9	af44d62e-9013-4c9d-9d43-7150b485068a	7	{"faces": [], "items": [{"id": "j3bninyzr", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [5.5, 0.5, 3], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "3pqcwf7ug", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.25, 0, 1.625], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}, {"id": "omxz9aq6u", "type": "catalog-item", "depth": 0.45, "label": "Locker 4 Compartimentos", "scale": [1, 1, 1], "width": 0.9, "height": 1.85, "layerId": "lines", "metadata": {"resizable": true, "model3dUrl": null, "floorAnchor": 0, "forwardAxis": "Z", "scaleFactor": 1}, "position": [3.75, 0, 0.875], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "abb900bc-ac69-43f5-a10d-54c0fee97a29", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-27 22:29:50.38	autosave	{"blueprint":{"locked":false,"opacity":0.5,"position":[0,-0.01,0],"rotation":0,"scale":1,"url":null,"visible":true},"faces":[],"groups":[],"items":[{"depth":0.45,"floorAnchor":0,"hasPriceAccess":true,"height":1.85,"id":"3pqcwf7ug","label":"Locker 4 Compartimentos","layerId":"lines","metadata":{"floorAnchor":0,"forwardAxis":"Z","model3dUrl":null,"resizable":true,"scaleFactor":1},"model3dUrl":null,"position":[3.25,0,1.625],"productId":"abb900bc-ac69-43f5-a10d-54c0fee97a29","resizable":true,"rotation":[0,0,0],"scale":[1,1,1],"snapPoints":[],"tenantId":"ad434e3f-b929-4ff4-a80d-11feac16b136","type":"catalog-item","width":0.9},{"depth":0.8,"floorAnchor":0,"hasPriceAccess":true,"height":0.75,"id":"j3bninyzr","label":"Escritorio Terra Roble","layerId":"lines","metadata":{"floorAnchor":0,"forwardAxis":"Z","model3dUrl":null,"resizable":true,"scaleFactor":1},"model3dUrl":null,"position":[5.5,0.5,3],"productId":"fb2a964a-2c4b-4521-9515-f4c734e8565c","resizable":true,"rotation":[0,0,0],"scale":[1,1,1],"snapPoints":[],"tenantId":"ad434e3f-b929-4ff4-a80d-11feac16b136","type":"catalog-item","width":1.6},{"depth":0.45,"floorAnchor":0,"hasPriceAccess":true,"height":1.85,"id":"omxz9aq6u","label":"Locker 4 Compartimentos","layerId":"lines","metadata":{"floorAnchor":0,"forwardAxis":"Z","model3dUrl":null,"resizable":true,"scaleFactor":1},"model3dUrl":null,"position":[3.75,0,0.875],"productId":"abb900bc-ac69-43f5-a10d-54c0fee97a29","resizable":true,"rotation":[0,0,0],"scale":[1,1,1],"snapPoints":[],"tenantId":"ad434e3f-b929-4ff4-a80d-11feac16b136","type":"catalog-item","width":0.9}],"lines":[],"openings":[],"rectangles":[],"scenes":[],"volumes":[],"walls":[]}	{"totalItems": 3, "totalLines": 0, "totalWalls": 0, "totalOpenings": 0}
4d4b962f-9610-4c6f-b2ba-8a465e951e39	e3391f89-3e70-420e-becc-800cf65916aa	1	{"faces": [], "items": [{"id": "12l8axb4b", "type": "catalog-item", "depth": 0.75, "label": "sillon 3ds", "price": 1213, "scale": [1, 1, 1], "width": 0.78, "height": 0.75, "layerId": "lines", "metadata": {"materials": 1, "triangles": 42818, "model3dUrl": "/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb", "validation": "warning", "boundingBox": {"max": [321.5899516055998, 264.126130275497, 11.51466882270872], "min": [-321.369626817166, -248.6159647590168, -5.633164698566948], "depth": 17.1478, "width": 642.9596, "height": 512.7421}, "convertedAt": "2026-03-28T03:57:21.987Z", "orientation": {"status": "warning", "centered": false, "warnings": ["Modelo por debajo del piso (min.Y = -248.616m)", "Modelo descentrado (centro: X=0.110, Z=2.941)", "Modelo muy grande (max dim = 643.0m). Verificar escala."], "floorAligned": false}, "dracoEnabled": true, "originalFormat": "3ds", "originalSizeMb": 3.0375, "optimizedSizeMb": 0.3043, "compressionRatio": 90, "originalSizeBytes": 3185017, "optimizedSizeBytes": 319120, "validationWarnings": ["42,818 triángulos — recomendado < 10K", "Modelo por debajo del piso (min.Y = -248.616m)", "Modelo descentrado (centro: X=0.110, Z=2.941)", "Modelo muy grande (max dim = 643.0m). Verificar escala."]}, "position": [0, 0, 0], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "1a8df8c7-601e-44fb-9037-82c7adf63b60", "resizable": true, "model3dUrl": "/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb", "snapPoints": [], "floorAnchor": 0.5, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-28 03:58:05.537	autosave	{"blueprint":{"locked":false,"opacity":0.5,"position":[0,-0.01,0],"rotation":0,"scale":1,"url":null,"visible":true},"faces":[],"groups":[],"items":[{"depth":0.75,"floorAnchor":0.5,"hasPriceAccess":true,"height":0.75,"id":"12l8axb4b","label":"sillon 3ds","layerId":"lines","metadata":{"boundingBox":{"depth":17.1478,"height":512.7421,"max":[321.5899516055998,264.126130275497,11.51466882270872],"min":[-321.369626817166,-248.6159647590168,-5.633164698566948],"width":642.9596},"compressionRatio":90,"convertedAt":"2026-03-28T03:57:21.987Z","dracoEnabled":true,"materials":1,"model3dUrl":"/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb","optimizedSizeBytes":319120,"optimizedSizeMb":0.3043,"orientation":{"centered":false,"floorAligned":false,"status":"warning","warnings":["Modelo por debajo del piso (min.Y = -248.616m)","Modelo descentrado (centro: X=0.110, Z=2.941)","Modelo muy grande (max dim = 643.0m). Verificar escala."]},"originalFormat":"3ds","originalSizeBytes":3185017,"originalSizeMb":3.0375,"triangles":42818,"validation":"warning","validationWarnings":["42,818 triángulos — recomendado < 10K","Modelo por debajo del piso (min.Y = -248.616m)","Modelo descentrado (centro: X=0.110, Z=2.941)","Modelo muy grande (max dim = 643.0m). Verificar escala."]},"model3dUrl":"/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb","position":[0,0,0],"price":1213,"productId":"1a8df8c7-601e-44fb-9037-82c7adf63b60","resizable":true,"rotation":[0,0,0],"scale":[1,1,1],"snapPoints":[],"tenantId":"ad434e3f-b929-4ff4-a80d-11feac16b136","type":"catalog-item","width":0.78}],"lines":[],"openings":[],"rectangles":[],"scenes":[],"volumes":[],"walls":[]}	{"totalItems": 1, "totalLines": 0, "totalWalls": 0, "totalOpenings": 0}
e574469c-a869-4af2-978a-c655f61e0d74	e3391f89-3e70-420e-becc-800cf65916aa	2	{"faces": [], "items": [{"id": "12l8axb4b", "type": "catalog-item", "depth": 0.75, "label": "sillon 3ds", "price": 1213, "scale": [1, 1, 1], "width": 0.78, "height": 0.75, "layerId": "lines", "metadata": {"materials": 1, "triangles": 42818, "model3dUrl": "/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb", "validation": "warning", "boundingBox": {"max": [321.5899516055998, 264.126130275497, 11.51466882270872], "min": [-321.369626817166, -248.6159647590168, -5.633164698566948], "depth": 17.1478, "width": 642.9596, "height": 512.7421}, "convertedAt": "2026-03-28T03:57:21.987Z", "orientation": {"status": "warning", "centered": false, "warnings": ["Modelo por debajo del piso (min.Y = -248.616m)", "Modelo descentrado (centro: X=0.110, Z=2.941)", "Modelo muy grande (max dim = 643.0m). Verificar escala."], "floorAligned": false}, "dracoEnabled": true, "originalFormat": "3ds", "originalSizeMb": 3.0375, "optimizedSizeMb": 0.3043, "compressionRatio": 90, "originalSizeBytes": 3185017, "optimizedSizeBytes": 319120, "validationWarnings": ["42,818 triángulos — recomendado < 10K", "Modelo por debajo del piso (min.Y = -248.616m)", "Modelo descentrado (centro: X=0.110, Z=2.941)", "Modelo muy grande (max dim = 643.0m). Verificar escala."]}, "position": [0, 0, 0], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "1a8df8c7-601e-44fb-9037-82c7adf63b60", "resizable": true, "model3dUrl": "/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb", "snapPoints": [], "floorAnchor": 0.5, "hasPriceAccess": true}, {"id": "it10tugry", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"failedAt": "2026-03-28T03:39:59.618Z", "errorType": "conversion", "model3dUrl": null, "originalFormat": "dwg", "originalSizeMb": 1.7672, "originalSizeBytes": 1853046}, "position": [0, 0, 0], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0.5, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-28 03:58:17.58	autosave	{"blueprint":{"locked":false,"opacity":0.5,"position":[0,-0.01,0],"rotation":0,"scale":1,"url":null,"visible":true},"faces":[],"groups":[],"items":[{"depth":0.75,"floorAnchor":0.5,"hasPriceAccess":true,"height":0.75,"id":"12l8axb4b","label":"sillon 3ds","layerId":"lines","metadata":{"boundingBox":{"depth":17.1478,"height":512.7421,"max":[321.5899516055998,264.126130275497,11.51466882270872],"min":[-321.369626817166,-248.6159647590168,-5.633164698566948],"width":642.9596},"compressionRatio":90,"convertedAt":"2026-03-28T03:57:21.987Z","dracoEnabled":true,"materials":1,"model3dUrl":"/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb","optimizedSizeBytes":319120,"optimizedSizeMb":0.3043,"orientation":{"centered":false,"floorAligned":false,"status":"warning","warnings":["Modelo por debajo del piso (min.Y = -248.616m)","Modelo descentrado (centro: X=0.110, Z=2.941)","Modelo muy grande (max dim = 643.0m). Verificar escala."]},"originalFormat":"3ds","originalSizeBytes":3185017,"originalSizeMb":3.0375,"triangles":42818,"validation":"warning","validationWarnings":["42,818 triángulos — recomendado < 10K","Modelo por debajo del piso (min.Y = -248.616m)","Modelo descentrado (centro: X=0.110, Z=2.941)","Modelo muy grande (max dim = 643.0m). Verificar escala."]},"model3dUrl":"/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb","position":[0,0,0],"price":1213,"productId":"1a8df8c7-601e-44fb-9037-82c7adf63b60","resizable":true,"rotation":[0,0,0],"scale":[1,1,1],"snapPoints":[],"tenantId":"ad434e3f-b929-4ff4-a80d-11feac16b136","type":"catalog-item","width":0.78},{"depth":0.8,"floorAnchor":0.5,"hasPriceAccess":true,"height":0.75,"id":"it10tugry","label":"Escritorio Terra Roble","layerId":"lines","metadata":{"errorType":"conversion","failedAt":"2026-03-28T03:39:59.618Z","model3dUrl":null,"originalFormat":"dwg","originalSizeBytes":1853046,"originalSizeMb":1.7672},"model3dUrl":null,"position":[0,0,0],"productId":"fb2a964a-2c4b-4521-9515-f4c734e8565c","resizable":true,"rotation":[0,0,0],"scale":[1,1,1],"snapPoints":[],"tenantId":"ad434e3f-b929-4ff4-a80d-11feac16b136","type":"catalog-item","width":1.6}],"lines":[],"openings":[],"rectangles":[],"scenes":[],"volumes":[],"walls":[]}	{"totalItems": 2, "totalLines": 0, "totalWalls": 0, "totalOpenings": 0}
b0d97be3-b404-4454-844e-88e740f726f3	e3391f89-3e70-420e-becc-800cf65916aa	3	{"faces": [], "items": [{"id": "it10tugry", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"failedAt": "2026-03-28T03:39:59.618Z", "errorType": "conversion", "model3dUrl": null, "originalFormat": "dwg", "originalSizeMb": 1.7672, "originalSizeBytes": 1853046}, "position": [0, 0, 0], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0.5, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-28 03:58:25.293	autosave	{"blueprint":{"locked":false,"opacity":0.5,"position":[0,-0.01,0],"rotation":0,"scale":1,"url":null,"visible":true},"faces":[],"groups":[],"items":[{"depth":0.8,"floorAnchor":0.5,"hasPriceAccess":true,"height":0.75,"id":"it10tugry","label":"Escritorio Terra Roble","layerId":"lines","metadata":{"errorType":"conversion","failedAt":"2026-03-28T03:39:59.618Z","model3dUrl":null,"originalFormat":"dwg","originalSizeBytes":1853046,"originalSizeMb":1.7672},"model3dUrl":null,"position":[0,0,0],"productId":"fb2a964a-2c4b-4521-9515-f4c734e8565c","resizable":true,"rotation":[0,0,0],"scale":[1,1,1],"snapPoints":[],"tenantId":"ad434e3f-b929-4ff4-a80d-11feac16b136","type":"catalog-item","width":1.6}],"lines":[],"openings":[],"rectangles":[],"scenes":[],"volumes":[],"walls":[]}	{"totalItems": 1, "totalLines": 0, "totalWalls": 0, "totalOpenings": 0}
bdcf9381-aa54-4cd3-949a-d3f438d9864a	e3391f89-3e70-420e-becc-800cf65916aa	4	{"faces": [], "items": [], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-28 03:58:30.688	autosave	{"blueprint":{"locked":false,"opacity":0.5,"position":[0,-0.01,0],"rotation":0,"scale":1,"url":null,"visible":true},"faces":[],"groups":[],"items":[],"lines":[],"openings":[],"rectangles":[],"scenes":[],"volumes":[],"walls":[]}	{"totalItems": 0, "totalLines": 0, "totalWalls": 0, "totalOpenings": 0}
f736d976-4d37-4190-811b-fb7b75b6e9a4	e3391f89-3e70-420e-becc-800cf65916aa	5	{"faces": [], "items": [{"id": "y1rg0kyct", "type": "catalog-item", "depth": 0.75, "label": "sillon 3ds", "price": 1213, "scale": [1, 1, 1], "width": 0.78, "height": 0.75, "layerId": "lines", "metadata": {"materials": 1, "triangles": 42818, "model3dUrl": "/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb", "validation": "warning", "boundingBox": {"max": [321.5899516055998, 264.126130275497, 11.51466882270872], "min": [-321.369626817166, -248.6159647590168, -5.633164698566948], "depth": 17.1478, "width": 642.9596, "height": 512.7421}, "convertedAt": "2026-03-28T03:57:21.987Z", "orientation": {"status": "warning", "centered": false, "warnings": ["Modelo por debajo del piso (min.Y = -248.616m)", "Modelo descentrado (centro: X=0.110, Z=2.941)", "Modelo muy grande (max dim = 643.0m). Verificar escala."], "floorAligned": false}, "dracoEnabled": true, "originalFormat": "3ds", "originalSizeMb": 3.0375, "optimizedSizeMb": 0.3043, "compressionRatio": 90, "originalSizeBytes": 3185017, "optimizedSizeBytes": 319120, "validationWarnings": ["42,818 triángulos — recomendado < 10K", "Modelo por debajo del piso (min.Y = -248.616m)", "Modelo descentrado (centro: X=0.110, Z=2.941)", "Modelo muy grande (max dim = 643.0m). Verificar escala."]}, "position": [0, 0, 0], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "1a8df8c7-601e-44fb-9037-82c7adf63b60", "resizable": true, "model3dUrl": "/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb", "snapPoints": [], "floorAnchor": 0.5, "hasPriceAccess": true}, {"id": "sm32nflqn", "type": "catalog-item", "depth": 0.8, "label": "Escritorio Terra Roble", "scale": [1, 1, 1], "width": 1.6, "height": 0.75, "layerId": "lines", "metadata": {"failedAt": "2026-03-28T03:39:59.618Z", "errorType": "conversion", "model3dUrl": null, "originalFormat": "dwg", "originalSizeMb": 1.7672, "originalSizeBytes": 1853046}, "position": [0, 0, 0], "rotation": [0, 0, 0], "tenantId": "ad434e3f-b929-4ff4-a80d-11feac16b136", "productId": "fb2a964a-2c4b-4521-9515-f4c734e8565c", "resizable": true, "model3dUrl": null, "snapPoints": [], "floorAnchor": 0.5, "hasPriceAccess": true}], "lines": [], "walls": [], "groups": [], "layers": [{"id": "walls", "name": "Muros", "locked": false, "visible": true}, {"id": "openings", "name": "Huecos", "locked": false, "visible": true}, {"id": "assets", "name": "Objetos", "locked": false, "visible": true}, {"id": "dimensions", "name": "Dimensiones", "locked": false, "visible": true}, {"id": "lines", "name": "Líneas de boceto", "locked": false, "visible": true}, {"id": "rectangles", "name": "Rectángulos", "locked": false, "visible": true}, {"id": "faces", "name": "Caras", "locked": false, "visible": true}, {"id": "volumes", "name": "Volúmenes", "locked": false, "visible": true}], "scenes": [], "volumes": [], "openings": [], "blueprint": {"url": null, "scale": 1, "locked": false, "opacity": 0.5, "visible": true, "position": [0, -0.01, 0], "rotation": 0}, "dimensions": [], "rectangles": []}	2026-03-28 04:02:59.766	autosave	{"blueprint":{"locked":false,"opacity":0.5,"position":[0,-0.01,0],"rotation":0,"scale":1,"url":null,"visible":true},"faces":[],"groups":[],"items":[{"depth":0.8,"floorAnchor":0.5,"hasPriceAccess":true,"height":0.75,"id":"sm32nflqn","label":"Escritorio Terra Roble","layerId":"lines","metadata":{"errorType":"conversion","failedAt":"2026-03-28T03:39:59.618Z","model3dUrl":null,"originalFormat":"dwg","originalSizeBytes":1853046,"originalSizeMb":1.7672},"model3dUrl":null,"position":[0,0,0],"productId":"fb2a964a-2c4b-4521-9515-f4c734e8565c","resizable":true,"rotation":[0,0,0],"scale":[1,1,1],"snapPoints":[],"tenantId":"ad434e3f-b929-4ff4-a80d-11feac16b136","type":"catalog-item","width":1.6},{"depth":0.75,"floorAnchor":0.5,"hasPriceAccess":true,"height":0.75,"id":"y1rg0kyct","label":"sillon 3ds","layerId":"lines","metadata":{"boundingBox":{"depth":17.1478,"height":512.7421,"max":[321.5899516055998,264.126130275497,11.51466882270872],"min":[-321.369626817166,-248.6159647590168,-5.633164698566948],"width":642.9596},"compressionRatio":90,"convertedAt":"2026-03-28T03:57:21.987Z","dracoEnabled":true,"materials":1,"model3dUrl":"/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb","optimizedSizeBytes":319120,"optimizedSizeMb":0.3043,"orientation":{"centered":false,"floorAligned":false,"status":"warning","warnings":["Modelo por debajo del piso (min.Y = -248.616m)","Modelo descentrado (centro: X=0.110, Z=2.941)","Modelo muy grande (max dim = 643.0m). Verificar escala."]},"originalFormat":"3ds","originalSizeBytes":3185017,"originalSizeMb":3.0375,"triangles":42818,"validation":"warning","validationWarnings":["42,818 triángulos — recomendado < 10K","Modelo por debajo del piso (min.Y = -248.616m)","Modelo descentrado (centro: X=0.110, Z=2.941)","Modelo muy grande (max dim = 643.0m). Verificar escala."]},"model3dUrl":"/storage/converted/23ac4cc9-343f-499c-8775-64c0628c00d0.glb","position":[0,0,0],"price":1213,"productId":"1a8df8c7-601e-44fb-9037-82c7adf63b60","resizable":true,"rotation":[0,0,0],"scale":[1,1,1],"snapPoints":[],"tenantId":"ad434e3f-b929-4ff4-a80d-11feac16b136","type":"catalog-item","width":0.78}],"lines":[],"openings":[],"rectangles":[],"scenes":[],"volumes":[],"walls":[]}	{"totalItems": 2, "totalLines": 0, "totalWalls": 0, "totalOpenings": 0}
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.projects (id, tenant_id, name, description, price_type, creator_id, client_company, client_name, commercial_status, contact_email, contact_name, contact_phone, created_at, due_date, estimated_value, final_value, operational_status, priority, probability, project_code, source, tags, updated_at) FROM stdin;
af44d62e-9013-4c9d-9d43-7150b485068a	ad434e3f-b929-4ff4-a80d-11feac16b136	New Projectjsadfas	\N	A	00d6c278-f539-4a6c-9ca2-1ac75cb8a8ff	\N	\N	Prospecto	\N	\N	\N	2026-03-27 04:41:05.32	\N	\N	\N	Sin iniciar	Media	\N	\N	\N	\N	2026-03-27 04:41:05.32
cb80999d-132a-4cdc-a5f2-329e18a98250	ad434e3f-b929-4ff4-a80d-11feac16b136	otris	Copia de New Projectjsadfas	A	00d6c278-f539-4a6c-9ca2-1ac75cb8a8ff	\N	\N	Descubrimiento	\N	\N	\N	2026-03-27 04:43:49.931	\N	\N	\N	Sin iniciar	Media	\N	\N	\N	\N	2026-03-27 04:44:15.751
36b6ba7b-4b64-4171-9ab1-375c14d277e9	ad434e3f-b929-4ff4-a80d-11feac16b136	New Projectjsadfas (COPIA)	Copia de New Projectjsadfas	A	00d6c278-f539-4a6c-9ca2-1ac75cb8a8ff	\N	\N	Diseño	\N	\N	\N	2026-03-27 04:41:21.396	\N	\N	\N	Sin iniciar	Media	\N	\N	\N	\N	2026-03-27 04:44:17.846
8efad843-e540-4d3c-a68d-028147937e56	b0a521ce-a8f0-4a63-997d-911c06aa7495	Proyecto Test 1774586735775	\N	A	0464a0e6-8763-46fb-927b-119fbfc0d30c	\N	\N	Prospecto	\N	\N	\N	2026-03-27 04:45:35.811	\N	\N	\N	Sin iniciar	Media	\N	\N	\N	\N	2026-03-27 04:45:35.811
d560b37f-6412-49fa-9ff9-7966205e9c9e	b0a521ce-a8f0-4a63-997d-911c06aa7495	Proyecto Test 1774586747566	\N	A	0464a0e6-8763-46fb-927b-119fbfc0d30c	\N	\N	Prospecto	\N	\N	\N	2026-03-27 04:45:47.605	\N	\N	\N	Sin iniciar	Media	\N	\N	\N	\N	2026-03-27 04:45:47.605
e3391f89-3e70-420e-becc-800cf65916aa	ad434e3f-b929-4ff4-a80d-11feac16b136	NUEVO DISEÑO	\N	A	00d6c278-f539-4a6c-9ca2-1ac75cb8a8ff	\N	\N	Prospecto	\N	\N	\N	2026-03-28 03:57:57.026	\N	\N	\N	Sin iniciar	Media	\N	\N	\N	\N	2026-03-28 03:57:57.026
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.quotes (id, tenant_id, project_version_id, total_amount, total_pieces, price_type, status, "quoteData", creator_id, "createdAt") FROM stdin;
56aa40d7-907b-401f-8efb-076e63570338	ad434e3f-b929-4ff4-a80d-11feac16b136	7550be06-3a79-4ef3-b99a-6c0d94109928	0.00	3	A	DRAFT	[{"product": "Escritorio Terra Roble", "lineTotal": 0, "unitPrice": 0}, {"product": "Locker 4 Compartimentos", "lineTotal": 0, "unitPrice": 0}, {"product": "Locker 4 Compartimentos", "lineTotal": 0, "unitPrice": 0}]	\N	2026-03-27 04:41:05.587
54cb38c8-83c0-436b-b63c-e486abef2ac0	ad434e3f-b929-4ff4-a80d-11feac16b136	df56185e-e19b-423f-92c9-39694c3b92af	0.00	3	A	DRAFT	[{"product": "Escritorio Terra Roble", "lineTotal": 0, "unitPrice": 0}, {"product": "Locker 4 Compartimentos", "lineTotal": 0, "unitPrice": 0}, {"product": "Locker 4 Compartimentos", "lineTotal": 0, "unitPrice": 0}]	\N	2026-03-27 04:43:59.971
0d47250a-e256-42dc-a74b-f185e4e40a7e	b0a521ce-a8f0-4a63-997d-911c06aa7495	4579730a-28a9-42df-ad19-28a27cc8bb99	0.00	1	A	DRAFT	[]	\N	2026-03-27 04:45:47.761
da779fcf-864c-4f11-bfd8-e8194a2fdbab	ad434e3f-b929-4ff4-a80d-11feac16b136	4d4b962f-9610-4c6f-b2ba-8a465e951e39	1213.00	1	A	DRAFT	[{"product": "sillon 3ds", "lineTotal": 1213, "unitPrice": 1213}]	\N	2026-03-28 03:58:05.599
af10e645-089d-4e8c-a914-b35c8c830c31	ad434e3f-b929-4ff4-a80d-11feac16b136	b0d97be3-b404-4454-844e-88e740f726f3	0.00	1	A	DRAFT	[{"product": "Escritorio Terra Roble", "lineTotal": 0, "unitPrice": 0}]	\N	2026-03-28 03:58:25.35
b6a5ab97-eeaa-4271-917e-6d52d37dca31	ad434e3f-b929-4ff4-a80d-11feac16b136	f736d976-4d37-4190-811b-fb7b75b6e9a4	1213.00	2	A	DRAFT	[{"product": "sillon 3ds", "lineTotal": 1213, "unitPrice": 1213}, {"product": "Escritorio Terra Roble", "lineTotal": 0, "unitPrice": 0}]	\N	2026-03-28 04:02:59.858
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.roles (id, name, description) FROM stdin;
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.rooms (id, project_version_id, name, area_square_meters, "dataJson") FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.tenants (id, name, slug, status, logo_url, contact_email, created_by_id, metadata, created_at, updated_at) FROM stdin;
b0a521ce-a8f0-4a63-997d-911c06aa7495	Demo Brand	demo-brand	INACTIVE	\N	admin@demobrand.io	00d6c278-f539-4a6c-9ca2-1ac75cb8a8ff	{"country": "MX", "industry": "demo"}	2026-03-25 04:23:37.71	2026-03-26 16:30:27.249
687ecfd3-7d47-461c-89c9-627bd5dfe8c7	Demo Company	demo	INACTIVE	\N	hola@demo.mx	\N	\N	2026-03-25 04:23:38.807	2026-03-26 16:30:37.356
ad434e3f-b929-4ff4-a80d-11feac16b136	PM La Piedad	pm-la-piedad	ACTIVE	\N	jx.granados@pmlapiedad.com	\N	\N	2026-03-25 04:23:39.032	2026-03-26 21:03:04.739
843c9ed9-5fce-4111-9839-34949786bed8	PM La Piedad	pm-lapiedad	ACTIVE	\N	contacto@pmlapiedad.com	00d6c278-f539-4a6c-9ca2-1ac75cb8a8ff	{"country": "MX", "industry": "furniture"}	2026-03-25 04:23:37.696	2026-03-27 02:49:53.238
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.user_roles (user_id, role_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.users (id, email, password, "firstName", "lastName", tenant_id, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: walls; Type: TABLE DATA; Schema: public; Owner: xlayout_user
--

COPY public.walls (id, project_version_id, room_id, start_x, start_y, end_x, end_y, thickness, height) FROM stdin;
\.


--
-- Name: activation_codes activation_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.activation_codes
    ADD CONSTRAINT activation_codes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: catalog_accesses catalog_accesses_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.catalog_accesses
    ADD CONSTRAINT catalog_accesses_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_brand_access company_brand_access_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.company_brand_access
    ADD CONSTRAINT company_brand_access_pkey PRIMARY KEY (company_id, brand_id);


--
-- Name: company_price_lists company_price_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.company_price_lists
    ADD CONSTRAINT company_price_lists_pkey PRIMARY KEY (tenant_id, price_list_id);


--
-- Name: company_users company_users_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_pkey PRIMARY KEY (id);


--
-- Name: discount_rules discount_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.discount_rules
    ADD CONSTRAINT discount_rules_pkey PRIMARY KEY (id);


--
-- Name: distributor_catalog_accesses distributor_catalog_accesses_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.distributor_catalog_accesses
    ADD CONSTRAINT distributor_catalog_accesses_pkey PRIMARY KEY (id);


--
-- Name: distributor_companies distributor_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.distributor_companies
    ADD CONSTRAINT distributor_companies_pkey PRIMARY KEY (id);


--
-- Name: distributor_price_markups distributor_price_markups_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.distributor_price_markups
    ADD CONSTRAINT distributor_price_markups_pkey PRIMARY KEY (id);


--
-- Name: distributor_users distributor_users_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.distributor_users
    ADD CONSTRAINT distributor_users_pkey PRIMARY KEY (id);


--
-- Name: end_users end_users_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.end_users
    ADD CONSTRAINT end_users_pkey PRIMARY KEY (id);


--
-- Name: import_jobs import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_pkey PRIMARY KEY (id);


--
-- Name: manufacturer_distributor_accesses manufacturer_distributor_accesses_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.manufacturer_distributor_accesses
    ADD CONSTRAINT manufacturer_distributor_accesses_pkey PRIMARY KEY (id);


--
-- Name: openings openings_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.openings
    ADD CONSTRAINT openings_pkey PRIMARY KEY (id);


--
-- Name: placements placements_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_pkey PRIMARY KEY (id);


--
-- Name: platform_users platform_users_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.platform_users
    ADD CONSTRAINT platform_users_pkey PRIMARY KEY (id);


--
-- Name: price_list_items price_list_items_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.price_list_items
    ADD CONSTRAINT price_list_items_pkey PRIMARY KEY (price_list_id, product_id_legacy);


--
-- Name: price_lists price_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.price_lists
    ADD CONSTRAINT price_lists_pkey PRIMARY KEY (id);


--
-- Name: product_assets product_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_assets
    ADD CONSTRAINT product_assets_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_conditions product_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_conditions
    ADD CONSTRAINT product_conditions_pkey PRIMARY KEY (id);


--
-- Name: product_lines product_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_lines
    ADD CONSTRAINT product_lines_pkey PRIMARY KEY (id);


--
-- Name: product_prices product_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT product_prices_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: project_versions project_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.project_versions
    ADD CONSTRAINT project_versions_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: walls walls_pkey; Type: CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.walls
    ADD CONSTRAINT walls_pkey PRIMARY KEY (id);


--
-- Name: activation_codes_code_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX activation_codes_code_key ON public.activation_codes USING btree (code);


--
-- Name: catalog_accesses_tenant_id_end_user_id_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX catalog_accesses_tenant_id_end_user_id_key ON public.catalog_accesses USING btree (tenant_id, end_user_id);


--
-- Name: company_users_email_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX company_users_email_key ON public.company_users USING btree (email);


--
-- Name: distributor_catalog_accesses_distributor_id_tenant_id_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX distributor_catalog_accesses_distributor_id_tenant_id_key ON public.distributor_catalog_accesses USING btree (distributor_id, tenant_id);


--
-- Name: distributor_companies_slug_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX distributor_companies_slug_key ON public.distributor_companies USING btree (slug);


--
-- Name: distributor_users_email_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX distributor_users_email_key ON public.distributor_users USING btree (email);


--
-- Name: end_users_email_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX end_users_email_key ON public.end_users USING btree (email);


--
-- Name: manufacturer_distributor_accesses_tenant_id_distributor_id_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX manufacturer_distributor_accesses_tenant_id_distributor_id_key ON public.manufacturer_distributor_accesses USING btree (tenant_id, distributor_id);


--
-- Name: platform_users_email_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX platform_users_email_key ON public.platform_users USING btree (email);


--
-- Name: product_categories_tenant_id_slug_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX product_categories_tenant_id_slug_key ON public.product_categories USING btree (tenant_id, slug);


--
-- Name: product_lines_tenant_id_slug_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX product_lines_tenant_id_slug_key ON public.product_lines USING btree (tenant_id, slug);


--
-- Name: product_prices_product_id_price_type_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX product_prices_product_id_price_type_key ON public.product_prices USING btree (product_id, price_type);


--
-- Name: products_tenant_id_sku_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX products_tenant_id_sku_key ON public.products USING btree (tenant_id, sku);


--
-- Name: project_versions_project_id_versionNum_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX "project_versions_project_id_versionNum_key" ON public.project_versions USING btree (project_id, "versionNum");


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: tenants_slug_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX tenants_slug_key ON public.tenants USING btree (slug);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: xlayout_user
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: activation_codes activation_codes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.activation_codes
    ADD CONSTRAINT activation_codes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_company_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_company_user_fk FOREIGN KEY (actor_id) REFERENCES public.company_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: audit_logs audit_end_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_end_user_fk FOREIGN KEY (actor_id) REFERENCES public.end_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_platform_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_platform_user_fk FOREIGN KEY (actor_id) REFERENCES public.platform_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: brands brand_legacy_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brand_legacy_company_fk FOREIGN KEY (tenant_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: brands brand_tenant_fk; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brand_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: catalog_accesses catalog_accesses_activated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.catalog_accesses
    ADD CONSTRAINT catalog_accesses_activated_by_user_id_fkey FOREIGN KEY (activated_by_user_id) REFERENCES public.company_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: catalog_accesses catalog_accesses_activation_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.catalog_accesses
    ADD CONSTRAINT catalog_accesses_activation_code_id_fkey FOREIGN KEY (activation_code_id) REFERENCES public.activation_codes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: catalog_accesses catalog_accesses_end_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.catalog_accesses
    ADD CONSTRAINT catalog_accesses_end_user_id_fkey FOREIGN KEY (end_user_id) REFERENCES public.end_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: catalog_accesses catalog_accesses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.catalog_accesses
    ADD CONSTRAINT catalog_accesses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_brand_access company_brand_access_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.company_brand_access
    ADD CONSTRAINT company_brand_access_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_brand_access company_brand_access_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.company_brand_access
    ADD CONSTRAINT company_brand_access_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_price_lists company_price_list_legacy_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.company_price_lists
    ADD CONSTRAINT company_price_list_legacy_company_fk FOREIGN KEY (tenant_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_price_lists company_price_list_tenant_fk; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.company_price_lists
    ADD CONSTRAINT company_price_list_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_price_lists company_price_lists_price_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.company_price_lists
    ADD CONSTRAINT company_price_lists_price_list_id_fkey FOREIGN KEY (price_list_id) REFERENCES public.price_lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_users company_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: discount_rules discount_rule_legacy_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.discount_rules
    ADD CONSTRAINT discount_rule_legacy_company_fk FOREIGN KEY (tenant_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: discount_rules discount_rule_tenant_fk; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.discount_rules
    ADD CONSTRAINT discount_rule_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: distributor_catalog_accesses distributor_catalog_accesses_distributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.distributor_catalog_accesses
    ADD CONSTRAINT distributor_catalog_accesses_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributor_companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: distributor_catalog_accesses distributor_catalog_accesses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.distributor_catalog_accesses
    ADD CONSTRAINT distributor_catalog_accesses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: distributor_price_markups distributor_price_markups_distributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.distributor_price_markups
    ADD CONSTRAINT distributor_price_markups_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributor_companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: distributor_users distributor_users_distributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.distributor_users
    ADD CONSTRAINT distributor_users_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributor_companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: import_jobs import_jobs_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.company_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: import_jobs import_jobs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: manufacturer_distributor_accesses manufacturer_distributor_accesses_distributor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.manufacturer_distributor_accesses
    ADD CONSTRAINT manufacturer_distributor_accesses_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributor_companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: manufacturer_distributor_accesses manufacturer_distributor_accesses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.manufacturer_distributor_accesses
    ADD CONSTRAINT manufacturer_distributor_accesses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: openings openings_project_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.openings
    ADD CONSTRAINT openings_project_version_id_fkey FOREIGN KEY (project_version_id) REFERENCES public.project_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: openings openings_wall_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.openings
    ADD CONSTRAINT openings_wall_id_fkey FOREIGN KEY (wall_id) REFERENCES public.walls(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: placements placements_project_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_project_version_id_fkey FOREIGN KEY (project_version_id) REFERENCES public.project_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: placements placements_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: price_list_items price_list_items_price_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.price_list_items
    ADD CONSTRAINT price_list_items_price_list_id_fkey FOREIGN KEY (price_list_id) REFERENCES public.price_lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_assets product_assets_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_assets
    ADD CONSTRAINT product_assets_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_assets product_assets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_assets
    ADD CONSTRAINT product_assets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_categories product_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.product_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_categories product_categories_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_conditions product_conditions_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_conditions
    ADD CONSTRAINT product_conditions_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.product_lines(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_conditions product_conditions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_conditions
    ADD CONSTRAINT product_conditions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_conditions product_conditions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_conditions
    ADD CONSTRAINT product_conditions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_lines product_lines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_lines
    ADD CONSTRAINT product_lines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_prices product_prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT product_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_prices product_prices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT product_prices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_variants product_variants_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products products_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.product_lines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: products products_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_versions project_versions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.project_versions
    ADD CONSTRAINT project_versions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: projects projects_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quotes quotes_project_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_project_version_id_fkey FOREIGN KEY (project_version_id) REFERENCES public.project_versions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rooms rooms_project_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_project_version_id_fkey FOREIGN KEY (project_version_id) REFERENCES public.project_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenants tenants_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.platform_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: walls walls_project_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.walls
    ADD CONSTRAINT walls_project_version_id_fkey FOREIGN KEY (project_version_id) REFERENCES public.project_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: walls walls_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xlayout_user
--

ALTER TABLE ONLY public.walls
    ADD CONSTRAINT walls_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict HtBfby4M4umxxo4H3x0oQTRLPXa1ByTC0IPTI8YZythJWRE3ExiCW3p8oqcGrsA

