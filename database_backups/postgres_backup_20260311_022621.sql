--
-- PostgreSQL database dump
--

\restrict TLUHLPLXXLdtyhkxT3EEsnAXUWFbNpLWf3pUjIY3rxfPc3Hu0L4h1skPHBM5RPW

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(200) DEFAULT '新对话'::character varying NOT NULL,
    model_id character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: generation_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.generation_records (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    url character varying(2000) NOT NULL,
    prompt text NOT NULL,
    model_name character varying(100) NOT NULL,
    model_id character varying(100),
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.generation_records OWNER TO postgres;

--
-- Name: mcp_servers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mcp_servers (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    url character varying(500) NOT NULL,
    description character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    status character varying(20) DEFAULT 'unknown'::character varying NOT NULL,
    tool_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mcp_servers OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: model_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.model_configs (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    provider character varying(50) NOT NULL,
    model_id character varying(100) NOT NULL,
    api_key text,
    base_url character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    model_type character varying(20) DEFAULT 'llm'::character varying NOT NULL
);


ALTER TABLE public.model_configs OWNER TO postgres;

--
-- Name: resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resources (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    filename character varying(255) NOT NULL,
    mime_type character varying(100),
    size bigint DEFAULT '0'::bigint NOT NULL,
    source character varying(50) DEFAULT 'upload'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.resources OWNER TO postgres;

--
-- Name: skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skills (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    skill_type character varying(20) DEFAULT 'api'::character varying NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.skills OWNER TO postgres;

--
-- Name: task_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_records (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    celery_task_id character varying(255),
    name character varying(255) NOT NULL,
    task_type character varying(100) DEFAULT 'general'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    result text,
    error text,
    model_id character varying(100),
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.task_records OWNER TO postgres;

--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_records (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    conversation_id uuid,
    model_id character varying(100) NOT NULL,
    model_name character varying(100) NOT NULL,
    provider character varying(50) NOT NULL,
    input_tokens integer DEFAULT 0 NOT NULL,
    cached_input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.usage_records OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
008
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, user_id, title, model_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: generation_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.generation_records (id, user_id, type, url, prompt, model_name, model_id, created_at) FROM stdin;
\.


--
-- Data for Name: mcp_servers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mcp_servers (id, name, url, description, is_active, status, tool_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, role, content, created_at) FROM stdin;
\.


--
-- Data for Name: model_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.model_configs (id, name, provider, model_id, api_key, base_url, is_active, is_default, created_at, updated_at, model_type) FROM stdin;
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resources (id, user_id, name, filename, mime_type, size, source, created_at) FROM stdin;
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skills (id, name, description, skill_type, config, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: task_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_records (id, user_id, celery_task_id, name, task_type, status, progress, result, error, model_id, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: usage_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usage_records (id, user_id, conversation_id, model_id, model_name, provider, input_tokens, cached_input_tokens, output_tokens, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role, is_active, created_at, updated_at) FROM stdin;
c61de6db-1b51-4938-966e-c59467e0bf08	admin	admin@example.com	$2b$12$PndwW0nSFMHray41CCKmbudR/ja0q/yvV/77Xv47CZJbp6YRmt/x.	admin	t	2026-03-10 18:07:35.989801	2026-03-10 18:07:35.989803
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: generation_records generation_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_records
    ADD CONSTRAINT generation_records_pkey PRIMARY KEY (id);


--
-- Name: mcp_servers mcp_servers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mcp_servers
    ADD CONSTRAINT mcp_servers_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: model_configs model_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.model_configs
    ADD CONSTRAINT model_configs_pkey PRIMARY KEY (id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: skills skills_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_name_key UNIQUE (name);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: task_records task_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_records
    ADD CONSTRAINT task_records_pkey PRIMARY KEY (id);


--
-- Name: usage_records usage_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_generation_records_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_generation_records_created_at ON public.generation_records USING btree (created_at);


--
-- Name: idx_generation_records_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_generation_records_user_id ON public.generation_records USING btree (user_id);


--
-- Name: ix_conversations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_conversations_user_id ON public.conversations USING btree (user_id);


--
-- Name: ix_messages_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: ix_resources_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_resources_user_id ON public.resources USING btree (user_id);


--
-- Name: ix_skills_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_skills_is_active ON public.skills USING btree (is_active);


--
-- Name: ix_task_records_celery_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_task_records_celery_task_id ON public.task_records USING btree (celery_task_id);


--
-- Name: ix_task_records_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_task_records_user_id ON public.task_records USING btree (user_id);


--
-- Name: ix_usage_records_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_usage_records_created_at ON public.usage_records USING btree (created_at);


--
-- Name: ix_usage_records_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_usage_records_user_id ON public.usage_records USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: conversations conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: generation_records generation_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generation_records
    ADD CONSTRAINT generation_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: resources resources_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_records task_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_records
    ADD CONSTRAINT task_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: usage_records usage_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict TLUHLPLXXLdtyhkxT3EEsnAXUWFbNpLWf3pUjIY3rxfPc3Hu0L4h1skPHBM5RPW

