import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { DashboardClient } from "../api/client.js";
import { ManagementClient } from "../api/management.js";
import type {
  CronJob,
  KnowledgeBase,
  KnowledgeBaseRetrievalResult,
  SessionRuleEntry,
  SessionRuleKey,
  SessionRulesPayload,
  SkillItem,
  SubagentConfig,
  SubagentDefinition,
} from "../api/management.types.js";
import type { I18n } from "../i18n/index.js";
import { textCells, truncateCells } from "./terminal.js";
import { managementText, type ManagementTextKey } from "./managementText.js";
import { normalizeSubagentConfig } from "./managementHelpers.js";

type ManagementSection = "cron" | "skills" | "subagents" | "sessions" | "knowledge";

interface ManagementViewProps {
  client: DashboardClient;
  width: number;
  height: number;
  i18n: I18n;
  active?: boolean;
}

interface PromptField {
  key: string;
  label: string;
  initial?: string;
  optional?: boolean;
  hint?: string;
}

interface PromptState {
  kind: "cron" | "session-create" | "session-edit" | "session-search" | "agent" | "kb-search" | "kb-retrieve";
  fields: PromptField[];
  values: Record<string, string>;
  index: number;
  target?: Record<string, unknown>;
}

type PendingConfirmation =
  | { kind: "cron-delete"; job: CronJob }
  | { kind: "skill-delete"; skill: SkillItem }
  | { kind: "session-delete"; rule: FlatSessionRule }
  | { kind: "agent-delete"; index: number; agent: SubagentDefinition };

interface FlatSessionRule {
  umo: string;
  key: SessionRuleKey;
  value: unknown;
  entry: SessionRuleEntry;
}

const SECTIONS: ManagementSection[] = ["cron", "skills", "subagents", "sessions", "knowledge"];
const EMPTY_SUBAGENT_CONFIG: SubagentConfig = {
  main_enable: false,
  remove_main_duplicate_tools: false,
  agents: [],
};

export function ManagementView({ client, width, height, i18n, active = true }: ManagementViewProps) {
  const api = useMemo(() => new ManagementClient(client), [client]);
  const [section, setSection] = useState<ManagementSection>("cron");
  const [selection, setSelection] = useState<Record<ManagementSection, number>>({
    cron: 0,
    skills: 0,
    subagents: 0,
    sessions: 0,
    knowledge: 0,
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillsRuntime, setSkillsRuntime] = useState("");
  const [subagentConfig, setSubagentConfig] = useState<SubagentConfig>(EMPTY_SUBAGENT_CONFIG);
  const [subagentBaseline, setSubagentBaseline] = useState("");
  const [sessionRules, setSessionRules] = useState<SessionRulesPayload | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionPage, setSessionPage] = useState(1);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [knowledgeTotal, setKnowledgeTotal] = useState(0);
  const [knowledgePage, setKnowledgePage] = useState(1);
  const [knowledgeDetail, setKnowledgeDetail] = useState<KnowledgeBase | null>(null);
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<Array<Record<string, unknown>>>([]);
  const [knowledgeDocumentTotal, setKnowledgeDocumentTotal] = useState(0);
  const [knowledgeDocumentPage, setKnowledgeDocumentPage] = useState(1);
  const [knowledgeDocumentSearch, setKnowledgeDocumentSearch] = useState("");
  const [retrievalResult, setRetrievalResult] = useState<KnowledgeBaseRetrievalResult | null>(null);
  const [retrievalSelectedIndex, setRetrievalSelectedIndex] = useState(0);
  const [retrievalScrollOffset, setRetrievalScrollOffset] = useState(0);
  const [retrievalFocus, setRetrievalFocus] = useState(false);
  const requestGeneration = useRef(0);
  const mounted = useRef(true);
  const inputValue = useRef("");

  const label = (key: ManagementTextKey) => managementText(i18n, key);
  const activeIndex = selection[section];
  const flatSessionRules = useMemo(() => flattenSessionRules(sessionRules), [sessionRules]);
  const subagentDirty = subagentBaseline !== "" && JSON.stringify(subagentConfig) !== subagentBaseline;
  const knowledgeInDetail = section === "knowledge" && knowledgeDetail !== null;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestGeneration.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setLoading(false);
      return;
    }
    const requestId = ++requestGeneration.current;
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        if (section === "cron") {
          const result = await api.listCronJobs();
          if (requestGeneration.current === requestId) setCronJobs(result || []);
        } else if (section === "skills") {
          const result = await api.getSkills();
          if (requestGeneration.current === requestId) {
            setSkills(Array.isArray(result?.skills) ? result.skills : []);
            setSkillsRuntime(result?.runtime || "");
          }
        } else if (section === "subagents") {
          if (subagentDirty) {
            if (requestGeneration.current === requestId) setLoading(false);
            return;
          }
          const result = await api.getSubagentConfig();
          if (requestGeneration.current === requestId) {
            const normalized = normalizeSubagentConfig(result);
            setSubagentConfig(normalized);
            setSubagentBaseline(JSON.stringify(normalized));
          }
        } else if (section === "sessions") {
          const result = await api.getSessionRules({ page: sessionPage, pageSize: 100, search: sessionSearch });
          if (requestGeneration.current === requestId) setSessionRules(normalizeSessionRules(result));
        } else if (section === "knowledge") {
          if (knowledgeDetail) {
            const [detail, documents] = await Promise.all([
              api.getKnowledgeBase(knowledgeDetail.kb_id),
              api.listKnowledgeBaseDocuments(knowledgeDetail.kb_id, {
                page: knowledgeDocumentPage,
                pageSize: 100,
                search: knowledgeDocumentSearch,
              }),
            ]);
            if (requestGeneration.current === requestId) {
              setKnowledgeDetail(detail);
              setKnowledgeDocuments(Array.isArray(documents?.items) ? documents.items : []);
              setKnowledgeDocumentTotal(Number(documents?.total || 0));
            }
          } else {
            const result = await api.listKnowledgeBases({ page: knowledgePage, pageSize: 100 });
            if (requestGeneration.current === requestId) {
              setKnowledgeBases(Array.isArray(result?.items) ? result.items : []);
              setKnowledgeTotal(Number(result?.total || 0));
            }
          }
        }
      } catch (cause) {
        if (requestGeneration.current === requestId && mounted.current) {
          setError(errorMessage(cause, label("loadFailed")));
        }
      } finally {
        if (requestGeneration.current === requestId && mounted.current) setLoading(false);
      }
    };
    void load();
    return () => {
      if (requestGeneration.current === requestId) requestGeneration.current += 1;
    };
  }, [active, api, section, refreshToken, sessionSearch, sessionPage, knowledgePage, knowledgeDetail?.kb_id, knowledgeDocumentSearch, knowledgeDocumentPage]);

  useEffect(() => {
    if (section === "subagents" && subagentDirty) {
      requestGeneration.current += 1;
      setLoading(false);
    }
  }, [section, subagentDirty]);

  const setSelectedIndex = (next: number) => {
    setSelection((current) => ({ ...current, [section]: Math.max(0, next) }));
  };

  const moveSection = (direction: number) => {
    const current = SECTIONS.indexOf(section);
    const next = (current + direction + SECTIONS.length) % SECTIONS.length;
    setSection(SECTIONS[next]);
    setNotice("");
    setError("");
  };

  const refresh = () => {
    if (section === "subagents" && subagentDirty) {
      setNotice(i18n.locale === "zh-CN" ? "有未保存的子代理更改；按 s 保存。" : "Subagent changes are unsaved; press s to save.");
      return;
    }
    setNotice("");
    setRefreshToken((value) => value + 1);
  };

  const mutateAndRefresh = async (operation: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await operation();
      if (mounted.current) {
        setNotice(success);
        setRefreshToken((value) => value + 1);
      }
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause, "Request failed"));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const beginPrompt = (
    kind: PromptState["kind"],
    fields: PromptField[],
    target?: Record<string, unknown>,
  ) => {
    const values = Object.fromEntries(fields.map((field) => [field.key, field.initial || ""]));
    inputValue.current = values[fields[0]?.key] || "";
    setPrompt({ kind, fields, values, index: 0, target });
    setNotice("");
    setError("");
  };

  const startCronPrompt = (job?: CronJob) => {
    const basic = Boolean(job && job.job_type !== "active_agent");
    const fields: PromptField[] = [
      { key: "name", label: label("jobName"), initial: job?.name || "" },
      {
        key: "note",
        label: label("note"),
        initial: String(job?.note || job?.description || ""),
      },
      {
        key: "schedule",
        label: basic ? label("cronExpression") : label("cronFormat"),
        initial: job ? (job.run_once ? "once" : job.cron_expression || "") : "0 9 * * *",
        hint: basic ? label("cronHint") : label("cronHint"),
      },
      ...(!basic
        ? [
            {
              key: "run_at",
              label: label("runAt"),
              initial: job?.run_at || "",
              optional: true,
              hint: label("invalidDate"),
            },
            {
              key: "session",
              label: label("sessionOptional"),
              initial: String(job?.session || job?.payload?.session || ""),
              optional: true,
            },
          ]
        : []),
      {
        key: "timezone",
        label: label("timezoneOptional"),
        initial: job?.timezone || "",
        optional: true,
      },
      { key: "enabled", label: i18n.locale === "zh-CN" ? "启用? (yes/no)" : "Enabled? (yes/no)", initial: job?.enabled === false ? "no" : "yes" },
    ];
    beginPrompt("cron", fields, {
      jobId: job?.job_id || "",
      basic,
      runOnce: Boolean(job?.run_once),
    });
  };

  const startSessionCreatePrompt = () => {
    const keys = sessionRules?.available_rule_keys || [];
    beginPrompt(
      "session-create",
      [
        { key: "umo", label: label("session") },
        {
          key: "rule_key",
          label: `${label("rule")} (${keys.join(", ")})`,
          initial: keys[0] || "session_service_config",
        },
        { key: "rule_value", label: label("value"), initial: "{}" },
      ],
    );
  };

  const startAgentPrompt = (agent?: SubagentDefinition, index?: number) => {
    beginPrompt(
      "agent",
      [
        { key: "name", label: label("agentName"), initial: agent?.name || "" },
        { key: "persona_id", label: label("personaId"), initial: agent?.persona_id || "", optional: true },
        { key: "system_prompt", label: label("systemPrompt"), initial: agent?.system_prompt || "", optional: true },
        { key: "public_description", label: label("publicDescription"), initial: agent?.public_description || "", optional: true },
        { key: "tools", label: label("toolsJson"), initial: agent?.tools === undefined ? "null" : JSON.stringify(agent.tools), optional: true },
        { key: "provider_id", label: label("providerId"), initial: agent?.provider_id || "", optional: true },
      ],
      { index: index ?? -1 },
    );
  };

  const completePrompt = async (submitted: PromptState) => {
    const values = { ...submitted.values, [submitted.fields[submitted.index]?.key || ""]: inputValue.current };
    const currentField = submitted.fields[submitted.index];
    if (currentField && !currentField.optional && !String(values[currentField.key] || "").trim()) {
      setNotice(label("required"));
      return;
    }
    const nextIndex = submitted.index + 1;
    if (nextIndex < submitted.fields.length) {
      const next = { ...submitted, values, index: nextIndex };
      inputValue.current = values[next.fields[nextIndex].key] || "";
      setPrompt(next);
      setNotice("");
      return;
    }

    setPrompt(null);
    inputValue.current = "";
    if (submitted.kind === "cron") {
      const schedule = String(values.schedule || "").trim();
      const once = !submitted.target?.basic && schedule.toLowerCase() === "once";
      if (!once && schedule.split(/\s+/).filter(Boolean).length !== 5) {
        setError(label("cronHint"));
        return;
      }
      if (once && !String(values.run_at || "").trim()) {
        setError(label("invalidDate"));
        return;
      }
      if (once && !isIsoDateTime(String(values.run_at))) {
        setError(label("invalidDate"));
        return;
      }
      const enabled = !["false", "no", "0", "off"].includes(String(values.enabled).trim().toLowerCase());
      const timezone = String(values.timezone || "").trim();
      const jobId = String(submitted.target?.jobId || "");
      if (submitted.target?.basic) {
        const payload = {
          name: values.name.trim(),
          description: values.note.trim(),
          cron_expression: schedule,
          timezone,
          enabled,
        };
        await mutateAndRefresh(
          () => jobId ? api.updateCronJob(jobId, payload) : api.createCronJob({
            name: payload.name,
            note: payload.description,
            run_once: false,
            cron_expression: payload.cron_expression,
            timezone: payload.timezone,
            enabled: payload.enabled,
          }),
          jobId ? label("saved") : label("create"),
        );
      } else {
        const payload = {
          name: values.name.trim(),
          note: values.note.trim(),
          run_once: once,
          cron_expression: once ? null : schedule,
          run_at: once ? String(values.run_at).trim() : null,
          session: String(values.session || "").trim(),
          timezone,
          enabled,
        };
        await mutateAndRefresh(
          () => jobId ? api.updateCronJob(jobId, payload) : api.createCronJob(payload),
          jobId ? label("saved") : label("create"),
        );
      }
    } else if (submitted.kind === "session-search") {
      setSessionSearch(String(values.search || "").trim());
      setSessionPage(1);
      setSelectedIndex(0);
      setRefreshToken((value) => value + 1);
    } else if (submitted.kind === "session-create" || submitted.kind === "session-edit") {
      const ruleKey = String(values.rule_key || submitted.target?.ruleKey || "") as SessionRuleKey;
      if (submitted.kind === "session-create" && !(sessionRules?.available_rule_keys || []).includes(ruleKey)) {
        setError(i18n.locale === "zh-CN" ? "规则键不受支持，请使用服务端列出的规则键。" : "Unsupported rule key. Use one of the keys listed by the server.");
        return;
      }
      let ruleValue: unknown;
      try {
        ruleValue = JSON.parse(String(values.rule_value || "null"));
      } catch {
        setError(label("invalidJson"));
        return;
      }
      await mutateAndRefresh(
        () => api.updateSessionRule(
          String(values.umo || submitted.target?.umo || "").trim(),
          ruleKey,
          ruleValue,
        ),
        label("saved"),
      );
    } else if (submitted.kind === "agent") {
      const index = Number(submitted.target?.index ?? -1);
      const prior = index >= 0 ? subagentConfig.agents[index] : undefined;
      const name = String(values.name || "").trim();
      const personaId = String(values.persona_id || "").trim();
      const systemPrompt = String(values.system_prompt || "").trim();
      if (!name || (!prior && !personaId && !systemPrompt)) {
        setError(i18n.locale === "zh-CN" ? "代理名不能为空；新建代理需填写 Persona ID 或内联提示词。" : "Agent name is required; a new agent needs a Persona ID or inline system prompt.");
        return;
      }
      let tools: unknown;
      try {
        tools = JSON.parse(String(values.tools || "null"));
      } catch {
        setError(label("invalidJson"));
        return;
      }
      if (tools !== null && (!Array.isArray(tools) || tools.some((tool) => typeof tool !== "string"))) {
        setError(i18n.locale === "zh-CN" ? "tools 必须为字符串数组或 null。" : "Tools must be a string array or null.");
        return;
      }
      const agent: SubagentDefinition = {
        ...(prior || {}),
        name,
        persona_id: personaId || null,
        system_prompt: systemPrompt,
        public_description: String(values.public_description || "").trim(),
        provider_id: String(values.provider_id || "").trim() || null,
        tools: tools as string[] | null,
        enabled: prior?.enabled ?? true,
      };
      const duplicateIndex = subagentConfig.agents.findIndex((item) => item.name === agent.name);
      if (duplicateIndex >= 0 && duplicateIndex !== index) {
        setError(i18n.locale === "zh-CN" ? "代理名重复。" : "Agent name already exists.");
        return;
      }
      const agents = [...subagentConfig.agents];
      if (index >= 0 && index < agents.length) {
        agent.enabled = agents[index].enabled;
        agents[index] = agent;
      } else {
        agents.push(agent);
        setSelectedIndex(agents.length + 1);
      }
      setSubagentConfig({ ...subagentConfig, agents });
      setNotice(i18n.locale === "zh-CN" ? "代理已更新到草稿；按 s 保存。" : "Agent draft updated; press s to save.");
    } else if (submitted.kind === "kb-search") {
      setKnowledgeDocumentSearch(String(values.search || "").trim());
      setRefreshToken((value) => value + 1);
    } else if (submitted.kind === "kb-retrieve") {
      const query = String(values.query || "").trim();
      if (!query || !knowledgeDetail) return;
      const requestId = requestGeneration.current;
      setBusy(true);
      setRetrievalResult(null);
      setRetrievalFocus(false);
      try {
        const result = await api.retrieveKnowledgeBase(knowledgeDetail.kb_name, query);
        if (mounted.current && requestGeneration.current === requestId) {
          setRetrievalResult(result);
          setRetrievalSelectedIndex(0);
          setRetrievalScrollOffset(0);
          setRetrievalFocus(true);
        }
      } catch (cause) {
        if (mounted.current && requestGeneration.current === requestId) setError(errorMessage(cause, "Retrieval failed"));
      } finally {
        if (mounted.current) setBusy(false);
      }
    }
  };

  const confirmPending = async () => {
    const pending = confirmation;
    setConfirmation(null);
    if (!pending) return;
    if (pending.kind === "cron-delete") {
      await mutateAndRefresh(() => api.deleteCronJob(pending.job.job_id), label("deleted"));
    } else if (pending.kind === "skill-delete") {
      await mutateAndRefresh(() => api.deleteSkill(pending.skill.name), label("deleted"));
    } else if (pending.kind === "session-delete") {
      await mutateAndRefresh(() => api.deleteSessionRule(pending.rule.umo, pending.rule.key), label("deleted"));
    } else {
      setSubagentConfig((current) => ({
        ...current,
        agents: current.agents.filter((_, index) => index !== pending.index),
      }));
      setSelectedIndex(Math.min(activeIndex, Math.max(0, subagentConfig.agents.length)));
      setNotice(i18n.locale === "zh-CN" ? "代理已从草稿移除；按 s 保存。" : "Agent removed from draft; press s to save.");
    }
  };

  const saveSubagents = async () => {
    if (busy || !subagentDirty) return;
    const names = new Set<string>();
    for (const agent of subagentConfig.agents) {
      const name = agent.name.trim();
      if (!name) continue;
      if (names.has(name)) {
        setError(i18n.locale === "zh-CN" ? `代理名重复：${agent.name}` : `Duplicate agent name: ${agent.name}`);
        return;
      }
      names.add(name);
    }
    setBusy(true);
    setError("");
    try {
      await api.updateSubagentConfig(subagentConfig);
      if (mounted.current) {
        setSubagentBaseline(JSON.stringify(subagentConfig));
        setNotice(label("saved"));
      }
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause, "Save failed"));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const listItems = getListItems(section, {
    cronJobs,
    skills,
    subagentConfig,
    flatSessionRules,
    knowledgeBases,
    knowledgeDocuments,
    knowledgeDetail,
    i18n,
  });
  useEffect(() => {
    if (selection[section] >= listItems.length && listItems.length > 0) {
      setSelectedIndex(listItems.length - 1);
    } else if (listItems.length === 0 && selection[section] > 0) {
      setSelectedIndex(0);
    }
  }, [section, listItems.length, selection]);
  const listCount = section === "sessions"
    ? sessionRules?.total || 0
    : section === "knowledge"
      ? knowledgeDetail ? knowledgeDocumentTotal : knowledgeTotal
      : listItems.length;
  const rowLimit = Math.max(1, Math.min(listItems.length || 1, height - 17 - (retrievalResult ? 6 : 0)));
  const listStart = Math.max(0, Math.min(listItems.length - rowLimit, activeIndex - Math.floor(rowLimit / 2)));
  const visibleRows = listItems.slice(listStart, listStart + rowLimit);
  const details = getDetails(section, activeIndex, {
    cronJobs,
    skills,
    subagentConfig,
    flatSessionRules,
    knowledgeBases,
    knowledgeDocuments,
    knowledgeDetail,
    skillsRuntime,
    i18n,
  });
  const contentWidth = Math.max(24, width - 4);
  const retrievalItems = retrievalResult?.results || [];
  const selectedRetrieval = retrievalItems[retrievalSelectedIndex];
  const retrievalContentLines = selectedRetrieval
    ? wrapTextCells(String(selectedRetrieval.content || ""), contentWidth - 2)
    : [];
  const retrievalContentRows = Math.max(1, Math.min(5, height - visibleRows.length - Math.min(details.length, 4) - 19));
  const maxRetrievalOffset = Math.max(0, retrievalContentLines.length - retrievalContentRows);
  const pageStatus = section === "sessions"
    ? `${label("page")} ${sessionPage}/${Math.max(1, Math.ceil((sessionRules?.total || 0) / Math.max(1, sessionRules?.page_size || 100)))}`
    : section === "knowledge"
      ? `${label("page")} ${knowledgeDetail ? knowledgeDocumentPage : knowledgePage}/${Math.max(1, Math.ceil((knowledgeDetail ? knowledgeDocumentTotal : knowledgeTotal) / 100))}`
      : "";

  useInput((input, key) => {
    if (prompt) {
      if (key.escape) {
        inputValue.current = "";
        setPrompt(null);
        setNotice(label("cancelled"));
      } else if (key.return) {
        void completePrompt(prompt);
      } else if (key.backspace || key.delete) {
        inputValue.current = inputValue.current.slice(0, -1);
        setPrompt({ ...prompt });
      } else if (input && !key.ctrl && !key.meta) {
        inputValue.current += input;
        setPrompt({ ...prompt });
      }
      return;
    }
    if (confirmation) {
      if (input.toLowerCase() === "y" || key.return) void confirmPending();
      else if (input.toLowerCase() === "n" || key.escape) {
        setConfirmation(null);
        setNotice(label("cancelled"));
      }
      return;
    }
    if (busy || key.ctrl || key.meta) return;
    if ((input === "n" || key.pageDown) && section === "sessions" && sessionRules && sessionPage * sessionRules.page_size < sessionRules.total) {
      setSessionPage((page) => page + 1);
      setSelectedIndex(0);
      setRefreshToken((value) => value + 1);
      return;
    }
    if ((input === "p" || key.pageUp) && section === "sessions" && sessionPage > 1) {
      setSessionPage((page) => page - 1);
      setSelectedIndex(0);
      setRefreshToken((value) => value + 1);
      return;
    }
    if ((input === "n" || key.pageDown) && section === "knowledge" && !knowledgeDetail && knowledgePage * 100 < knowledgeTotal) {
      setKnowledgePage((page) => page + 1);
      setSelectedIndex(0);
      setRefreshToken((value) => value + 1);
      return;
    }
    if ((input === "p" || key.pageUp) && section === "knowledge" && !knowledgeDetail && knowledgePage > 1) {
      setKnowledgePage((page) => page - 1);
      setSelectedIndex(0);
      setRefreshToken((value) => value + 1);
      return;
    }
    if ((input === "n" || key.pageDown) && section === "knowledge" && knowledgeDetail && knowledgeDocumentPage * 100 < knowledgeDocumentTotal) {
      setKnowledgeDocumentPage((page) => page + 1);
      setSelectedIndex(0);
      setRefreshToken((value) => value + 1);
      return;
    }
    if ((input === "p" || key.pageUp) && section === "knowledge" && knowledgeDetail && knowledgeDocumentPage > 1) {
      setKnowledgeDocumentPage((page) => page - 1);
      setSelectedIndex(0);
      setRefreshToken((value) => value + 1);
      return;
    }
    if (key.leftArrow || input === "h") {
      moveSection(-1);
      return;
    }
    if (key.rightArrow || input === "l") {
      moveSection(1);
      return;
    }
    if (section === "knowledge" && knowledgeDetail && retrievalItems.length && input === "[") {
      setRetrievalSelectedIndex((index) => (index - 1 + retrievalItems.length) % retrievalItems.length);
      setRetrievalScrollOffset(0);
      setRetrievalFocus(true);
      return;
    }
    if (section === "knowledge" && knowledgeDetail && retrievalItems.length && input === "]") {
      setRetrievalSelectedIndex((index) => (index + 1) % retrievalItems.length);
      setRetrievalScrollOffset(0);
      setRetrievalFocus(true);
      return;
    }
    if (key.upArrow) {
      if (section === "knowledge" && retrievalFocus && retrievalScrollOffset > 0) {
        setRetrievalScrollOffset((offset) => Math.max(0, offset - 1));
        return;
      }
      setSelectedIndex(Math.max(0, activeIndex - 1));
      return;
    }
    if (key.downArrow) {
      if (section === "knowledge" && retrievalFocus && retrievalScrollOffset < maxRetrievalOffset) {
        setRetrievalScrollOffset((offset) => Math.min(maxRetrievalOffset, offset + 1));
        return;
      }
      setSelectedIndex(Math.min(Math.max(0, listItems.length - 1), activeIndex + 1));
      return;
    }
    if (input === "r") {
      refresh();
      return;
    }
    if (input === "u" && section === "subagents" && subagentDirty) {
      setSubagentBaseline(JSON.stringify(subagentConfig));
      setNotice(i18n.locale === "zh-CN" ? "丢弃本地更改并重新加载…" : "Discarding local changes and reloading…");
      setRefreshToken((value) => value + 1);
      return;
    }
    if (section === "knowledge" && knowledgeDetail && input === "q") {
      setKnowledgeDetail(null);
      setKnowledgeDocuments([]);
      setKnowledgeDocumentTotal(0);
      setKnowledgeDocumentPage(1);
      setKnowledgeDocumentSearch("");
      setRetrievalResult(null);
      setRetrievalFocus(false);
      setSelectedIndex(0);
      setRefreshToken((value) => value + 1);
      return;
    }
    if (input === "/" && section === "sessions") {
      beginPrompt("session-search", [
        { key: "search", label: label("searchPrompt"), initial: sessionSearch },
      ], { action: "search" });
      return;
    }
    if (input === "/" && section === "knowledge" && knowledgeDetail) {
      beginPrompt("kb-search", [{ key: "search", label: label("searchPrompt"), initial: knowledgeDocumentSearch }]);
      return;
    }
    if (section === "knowledge" && input === "f" && knowledgeDetail) {
      beginPrompt("kb-retrieve", [{ key: "query", label: label("retrievalPrompt") }]);
      return;
    }
    if (section === "knowledge" && key.return && !knowledgeDetail) {
      const selected = knowledgeBases[activeIndex];
      if (selected) {
        setKnowledgeDetail(selected);
        setKnowledgeDocuments([]);
        setKnowledgeDocumentPage(1);
        setKnowledgeDocumentSearch("");
        setRetrievalResult(null);
        setRetrievalFocus(false);
        setSelectedIndex(0);
        setRefreshToken((value) => value + 1);
      }
      return;
    }
    if (section === "cron") {
      const job = cronJobs[activeIndex];
      if (input === "a") startCronPrompt();
      else if (input === "e" && job) startCronPrompt(job);
      else if (input === "t" && job) {
        void mutateAndRefresh(() => api.updateCronJob(job.job_id, { enabled: job.enabled === false }), label("updated"));
      } else if (input === "x" && job) {
        void mutateAndRefresh(() => api.runCronJob(job.job_id), label("started"));
      } else if (input === "d" && job) setConfirmation({ kind: "cron-delete", job });
    } else if (section === "skills") {
      const skill = skills[activeIndex];
      if (skill && input === "t" && isSkillWritable(skill)) {
        void mutateAndRefresh(() => api.setSkillActive(skill.name, skill.active === false), label("updated"));
      } else if (skill && input === "d" && isSkillWritable(skill)) {
        setConfirmation({ kind: "skill-delete", skill });
      }
    } else if (section === "subagents") {
      if (input === " " && activeIndex === 0) {
        setSubagentConfig((current) => ({ ...current, main_enable: !current.main_enable }));
      } else if (input === " " && activeIndex === 1) {
        setSubagentConfig((current) => ({ ...current, remove_main_duplicate_tools: !current.remove_main_duplicate_tools }));
      } else if (input === " " && activeIndex >= 2) {
        const agentIndex = activeIndex - 2;
        setSubagentConfig((current) => ({
          ...current,
          agents: current.agents.map((agent, index) => index === agentIndex ? { ...agent, enabled: !agent.enabled } : agent),
        }));
      } else if (input === "a") {
        const agentIndex = activeIndex - 2;
        const selectedAgent = agentIndex >= 0 ? subagentConfig.agents[agentIndex] : undefined;
        startAgentPrompt(selectedAgent, selectedAgent ? agentIndex : -1);
      } else if (input === "d" && activeIndex >= 2) {
        const agentIndex = activeIndex - 2;
        const agent = subagentConfig.agents[agentIndex];
        if (agent) setConfirmation({ kind: "agent-delete", index: agentIndex, agent });
      } else if (input === "s") {
        void saveSubagents();
      }
    } else if (section === "sessions") {
      const rule = flatSessionRules[activeIndex];
      if (input === "a") startSessionCreatePrompt();
      else if (input === "e" && rule) {
        beginPrompt("session-edit", [{ key: "rule_value", label: label("value"), initial: JSON.stringify(rule.value) }], {
          umo: rule.umo,
          ruleKey: rule.key,
        });
      } else if (input === "d" && rule) setConfirmation({ kind: "session-delete", rule });
    }
  }, { isActive: active });

  const selectedHeader = label(section === "cron" ? "cron" : section === "skills" ? "skills" : section === "subagents" ? "subagents" : section === "sessions" ? "sessions" : "knowledge");
  const position = listItems.length ? `${Math.min(activeIndex + 1, listItems.length)}/${listItems.length}` : "0/0";
  const hints = prompt
    ? label("cancelHint")
    : confirmation
      ? label("confirmHint")
      : section === "cron"
        ? `${label("listHint")} · ${label("cronHintKeys")}`
        : section === "skills"
          ? `${label("listHint")} · ${label("skillHintKeys")}`
          : section === "subagents"
            ? `${label("listHint")} · ${label("subagentHintKeys")}`
            : section === "sessions"
              ? `${label("listHint")} · ${label("sessionHintKeys")} · ${label("pageHint")}`
              : `${label("listHint")} · ${label("knowledgeHintKeys")} · ${label("pageHint")}`;

  if (!active) return null;

  return (
    <Box flexDirection="column" width={Math.max(24, width)}>
      <Box justifyContent="space-between">
        <Text bold>{label("title")} · {selectedHeader}</Text>
        <Text dimColor>{loading ? label("loading") : `${listCount} · ${position}${pageStatus ? ` · ${pageStatus}` : ""}${section === "subagents" && subagentDirty ? " · *" : ""}`}</Text>
      </Box>
      <Box marginTop={1} flexWrap="wrap">
        {SECTIONS.map((item, index) => (
          <Text key={item} inverse={item === section} color={item === section ? "cyan" : "gray"}>
            {` ${index + 1}:${label(item === "knowledge" ? "knowledge" : item)} `}
          </Text>
        ))}
        <Text dimColor> {label("tabHint")}</Text>
      </Box>
      <Box
        marginTop={1}
        flexDirection="column"
        borderStyle="single"
        borderColor={error ? "red" : "cyan"}
        paddingX={1}
        width={Math.max(24, width)}
        height={Math.max(6, height - 7)}
      >
        {loading && listItems.length === 0 ? <Text dimColor>{label("loading")}</Text> : null}
        {error ? <Text color="red">{truncateCells(error, contentWidth)}</Text> : null}
        {!error && !loading && listItems.length === 0 ? <Text dimColor>{label("empty")}</Text> : null}
        {listStart > 0 ? <Text dimColor>↑ {listStart} more</Text> : null}
        {visibleRows.map((row, offset) => {
          const rowIndex = listStart + offset;
          const selected = rowIndex === activeIndex;
          return (
            <Text key={row.key} inverse={selected} color={selected ? "cyan" : undefined}>
              {truncateCells(`${selected ? ">" : " "} ${row.label}${row.meta ? `  ${row.meta}` : ""}`, contentWidth)}
            </Text>
          );
        })}
        {listStart + visibleRows.length < listItems.length ? <Text dimColor>↓ {listItems.length - listStart - visibleRows.length} more</Text> : null}
        {details.length > 0 ? (
          <Box marginTop={1} flexDirection="column">
            <Text bold>{label("details")}</Text>
            {details.slice(0, Math.max(1, Math.min(8, height - listItems.length - 16))).map((detail, index) => (
              <Text key={`${detail.label}-${index}`}>
                <Text dimColor>{detail.label}: </Text>{truncateCells(detail.value, contentWidth - detail.label.length - 3)}
              </Text>
            ))}
          </Box>
        ) : null}
        {section === "knowledge" && knowledgeDetail && retrievalResult ? (
          <Box marginTop={1} flexDirection="column">
            <Text bold>{label("retrievalResults")} · {retrievalItems.length ? `${retrievalSelectedIndex + 1}/${retrievalItems.length}` : "0"}</Text>
            {!selectedRetrieval ? <Text dimColor>{label("noResults")}</Text> : (
              <>
                <Text dimColor>
                  {String(selectedRetrieval.doc_name || selectedRetrieval.file_name || "—")}
                  {selectedRetrieval.chunk_index !== undefined ? ` · #${String(selectedRetrieval.chunk_index)}` : ""}
                  {selectedRetrieval.score !== undefined ? ` · ${label("score")}: ${formatScore(selectedRetrieval.score)}` : ""}
                </Text>
                <Text dimColor>{label("content")} · {Math.min(retrievalScrollOffset + 1, retrievalContentLines.length)}/{retrievalContentLines.length}</Text>
                {retrievalContentLines.slice(retrievalScrollOffset, retrievalScrollOffset + retrievalContentRows).map((line, index) => (
                  <Text key={`retrieval-${retrievalSelectedIndex}-${retrievalScrollOffset + index}`}>{truncateCells(line, contentWidth)}</Text>
                ))}
              </>
            )}
          </Box>
        ) : null}
        {prompt ? (
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">{prompt.fields[prompt.index]?.label} ({prompt.index + 1}/{prompt.fields.length})</Text>
            {prompt.fields[prompt.index]?.hint ? <Text dimColor>{prompt.fields[prompt.index]?.hint}</Text> : null}
            <Text color="cyan">{truncateCells(`${inputValue.current}▌`, contentWidth)}</Text>
          </Box>
        ) : null}
        {confirmation ? <Text color="yellow">{label("confirmDelete")}</Text> : null}
        {busy ? <Text color="yellow">{label("loading")}</Text> : null}
      </Box>
      {notice ? <Text color="green">{truncateCells(notice, contentWidth)}</Text> : null}
      <Text dimColor>{hints} · {label("refreshHint")}</Text>
    </Box>
  );
}

function getListItems(section: ManagementSection, data: {
  cronJobs: CronJob[];
  skills: SkillItem[];
  subagentConfig: SubagentConfig;
  flatSessionRules: FlatSessionRule[];
  knowledgeBases: KnowledgeBase[];
  knowledgeDocuments: Array<Record<string, unknown>>;
  knowledgeDetail: KnowledgeBase | null;
  i18n: I18n;
}): Array<{ key: string; label: string; meta?: string }> {
  const t = (key: ManagementTextKey) => managementText(data.i18n, key);
  if (section === "cron") {
    return data.cronJobs.map((job) => ({
      key: job.job_id,
      label: String(job.name || job.note || job.job_id),
      meta: `${job.enabled === false ? t("disabled") : t("enabled")} · ${job.run_once ? String(job.run_at || "once") : String(job.cron_expression || "")}`,
    }));
  }
  if (section === "skills") {
    return data.skills.map((skill) => ({
      key: skill.name,
      label: skill.name,
      meta: `${skill.active === false ? t("disabled") : t("enabled")} · ${skill.source_type || "local"}`,
    }));
  }
  if (section === "subagents") {
    return [
      { key: "main", label: t("mainAgent"), meta: data.subagentConfig.main_enable ? t("enabled") : t("disabled") },
      { key: "duplicates", label: t("duplicateTools"), meta: data.subagentConfig.remove_main_duplicate_tools ? t("enabled") : t("disabled") },
      ...data.subagentConfig.agents.map((agent) => ({
        key: agent.name,
        label: agent.name,
        meta: `${agent.enabled ? t("enabled") : t("disabled")} · ${agent.persona_id}`,
      })),
    ];
  }
  if (section === "sessions") {
    return data.flatSessionRules.map((rule) => ({
      key: `${rule.umo}:${rule.key}`,
      label: `${rule.entry.display_name || rule.entry.user_alias || rule.umo} · ${rule.key}`,
      meta: truncateCells(compactJson(rule.value), 42),
    }));
  }
  if (data.knowledgeDetail) {
    return data.knowledgeDocuments.map((document, index) => ({
      key: String(document.document_id || document.doc_id || document.id || index),
      label: String(document.file_name || document.name || document.title || document.document_id || document.id || `Document ${index + 1}`),
      meta: `${document.chunk_count ?? document.chunks_count ?? ""}`,
    }));
  }
  return data.knowledgeBases.map((kb) => ({
    key: kb.kb_id,
    label: `${kb.emoji || "📚"} ${kb.kb_name}`,
    meta: `${kb.doc_count ?? 0} ${t("documents")} · ${kb.chunk_count ?? 0} ${t("chunks")}`,
  }));
}

function getDetails(section: ManagementSection, selectedIndex: number, data: {
  cronJobs: CronJob[];
  skills: SkillItem[];
  subagentConfig: SubagentConfig;
  flatSessionRules: FlatSessionRule[];
  knowledgeBases: KnowledgeBase[];
  knowledgeDocuments: Array<Record<string, unknown>>;
  knowledgeDetail: KnowledgeBase | null;
  skillsRuntime: string;
  i18n: I18n;
}): Array<{ label: string; value: string }> {
  const t = (key: ManagementTextKey) => managementText(data.i18n, key);
  if (section === "cron") {
    const job = data.cronJobs[selectedIndex];
    if (!job) return [];
    return [
      { label: "ID", value: job.job_id },
      { label: t("note"), value: String(job.note || job.description || t("noDescription")) },
      { label: t("target"), value: String(job.session || job.payload?.session || "—") },
      { label: t("timezone"), value: String(job.timezone || "—") },
      { label: t("nextRun"), value: String(job.next_run_time || job.run_at || "—") },
      { label: t("lastRun"), value: String(job.last_run_at || "—") },
      ...(job.last_error ? [{ label: "Error", value: String(job.last_error) }] : []),
    ];
  }
  if (section === "skills") {
    const skill = data.skills[selectedIndex];
    if (!skill) return [];
    return [
      { label: t("description"), value: String(skill.description || t("noDescription")) },
      { label: t("source"), value: String(skill.source_type || "local") },
      { label: t("runtime"), value: data.skillsRuntime || "—" },
      { label: "Path", value: String(skill.path || "—") },
      ...(!isSkillWritable(skill) ? [{ label: t("readOnly"), value: String(skill.plugin_name || skill.source_type || "") }] : []),
    ];
  }
  if (section === "subagents") {
    if (selectedIndex === 0) return [
      { label: t("enabled"), value: String(data.subagentConfig.main_enable) },
      { label: t("duplicateTools"), value: String(data.subagentConfig.remove_main_duplicate_tools) },
      { label: t("agent"), value: `${data.subagentConfig.agents.length}` },
    ];
    if (selectedIndex === 1) return [{ label: t("duplicateTools"), value: String(data.subagentConfig.remove_main_duplicate_tools) }];
    const agent = data.subagentConfig.agents[selectedIndex - 2];
    return agent ? [
      { label: t("personaId"), value: String(agent.persona_id || "—") },
      { label: t("systemPrompt"), value: agent.system_prompt || "—" },
      { label: t("publicDescription"), value: agent.public_description || "—" },
      { label: t("providerId"), value: agent.provider_id || "—" },
      { label: t("toolsJson"), value: compactJson(agent.tools ?? null) },
    ] : [];
  }
  if (section === "sessions") {
    const rule = data.flatSessionRules[selectedIndex];
    return rule ? [{ label: `${rule.umo} · ${rule.key}`, value: compactJson(rule.value) }] : [];
  }
  if (data.knowledgeDetail) {
    const kb = data.knowledgeDetail;
    const items = [
      { label: t("details"), value: kb.kb_name },
      { label: t("description"), value: String(kb.description || t("noDescription")) },
      { label: t("embedding"), value: String(kb.embedding_provider_id || "—") },
      { label: t("reranker"), value: String(kb.rerank_provider_id || "—") },
      { label: t("documents"), value: String(kb.doc_count ?? data.knowledgeDocuments.length) },
      { label: t("chunks"), value: String(kb.chunk_count ?? "—") },
    ];
    return items;
  }
  const kb = data.knowledgeBases[selectedIndex];
  return kb ? [
    { label: "ID", value: kb.kb_id },
    { label: t("description"), value: String(kb.description || t("noDescription")) },
    { label: t("embedding"), value: String(kb.embedding_provider_id || "—") },
    { label: t("documents"), value: String(kb.doc_count ?? 0) },
    { label: t("chunks"), value: String(kb.chunk_count ?? 0) },
  ] : [];
}

function flattenSessionRules(payload: SessionRulesPayload | null): FlatSessionRule[] {
  if (!payload) return [];
  const result: FlatSessionRule[] = [];
  for (const entry of payload.rules || []) {
    for (const [key, value] of Object.entries(entry.rules || {})) {
      result.push({ umo: entry.umo, key: key as SessionRuleKey, value, entry });
    }
  }
  return result;
}

function normalizeSessionRules(value: SessionRulesPayload): SessionRulesPayload {
  return {
    ...value,
    rules: Array.isArray(value?.rules) ? value.rules : [],
    total: Number(value?.total || 0),
    page: Number(value?.page || 1),
    page_size: Number(value?.page_size || 100),
    available_rule_keys: Array.isArray(value?.available_rule_keys) ? value.available_rule_keys : [],
  };
}

function isSkillWritable(skill: SkillItem): boolean {
  return skill.source_type !== "sandbox_only" && skill.source_type !== "plugin";
}

function compactJson(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function wrapTextCells(value: string, width: number): string[] {
  const maxWidth = Math.max(1, width);
  const lines: string[] = [];
  for (const sourceLine of String(value).replace(/\r/g, "").split("\n")) {
    let line = "";
    let used = 0;
    for (const cell of textCells(sourceLine)) {
      if (line && used + cell.width > maxWidth) {
        lines.push(line);
        line = "";
        used = 0;
      }
      line += cell.segment;
      used += cell.width;
    }
    lines.push(line);
  }
  return lines;
}

function formatScore(value: unknown): string {
  const score = Number(value);
  return Number.isFinite(score) ? score.toFixed(4) : String(value);
}

function isIsoDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

function errorMessage(value: unknown, fallback: string): string {
  return value instanceof Error && value.message ? value.message : fallback;
}
