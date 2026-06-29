"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Apple,
  Banana,
  Bath,
  Bean,
  Beef,
  Beer,
  Bell,
  Boxes,
  BottleWine,
  BrushCleaning,
  Bubbles,
  Carrot,
  Check,
  ChevronRight,
  ChefHat,
  Cherry,
  ClipboardList,
  Coffee,
  CookingPot,
  Copy,
  Croissant,
  CupSoda,
  Droplet,
  Drumstick,
  Egg,
  Fish,
  GlassWater,
  Grape,
  Ham,
  History,
  HomeIcon,
  ImagePlus,
  KeyRound,
  MessageCircle,
  Milk,
  Package,
  PackageOpen,
  PillBottle,
  Plus,
  RotateCcw,
  Salad,
  Search,
  Settings,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  SoapDispenserDroplet,
  Soup,
  Sparkles,
  SprayCan,
  Sandwich,
  Toilet,
  Trash2,
  Utensils,
  UsersRound,
  WashingMachine,
  Wheat,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { isSupabaseConfigured, supabase, supabaseConfigError } from "@/lib/supabase/client";

const lineFriendUrl = process.env.NEXT_PUBLIC_LINE_FRIEND_URL ?? "";

type Screen = "login" | "setup" | "stock" | "add" | "detail" | "edit" | "history" | "settings";
type ItemStatus = "in_stock" | "low" | "out" | "discontinued";
type Category = "調味料" | "食料品" | "日用品" | "飲料品" | "その他";
type Filter = "all" | "needs" | Category;
type CategoryIcons = Record<Category, string>;

const categories: Category[] = ["調味料", "食料品", "日用品", "飲料品", "その他"];
const defaultCategoryIcons: CategoryIcons = {
  [categories[0]]: "CookingPot",
  [categories[1]]: "Carrot",
  [categories[2]]: "SoapDispenserDroplet",
  [categories[3]]: "CupSoda",
  [categories[4]]: "ShoppingBasket",
} as CategoryIcons;
const categoryIconChoices: CategoryIcons = {
  [categories[0]]: ["CookingPot", "Utensils", "Soup", "ChefHat", "PillBottle", "BottleWine", "Droplet"].join(","),
  [categories[1]]: ["Apple", "Banana", "Carrot", "Fish", "Grape", "Cherry", "Beef", "Egg", "Wheat", "Bean", "Ham", "Drumstick", "Salad", "Sandwich", "Croissant"].join(","),
  [categories[2]]: ["SoapDispenserDroplet", "SprayCan", "Bubbles", "BrushCleaning", "WashingMachine", "Toilet", "Bath", "Shirt", "Package"].join(","),
  [categories[3]]: ["CupSoda", "Milk", "GlassWater", "Coffee", "Beer", "Wine", "BottleWine"].join(","),
  [categories[4]]: ["ShoppingBasket", "Package", "PackageOpen", "Boxes", "ShoppingBag"].join(","),
} as CategoryIcons;

function getCategoryIconChoices(category: Category) {
  return categoryIconChoices[category].split(",");
}

const lucideIcons: Record<string, LucideIcon> = {
  ArrowLeft,
  Apple,
  Banana,
  Bath,
  Bean,
  Beef,
  Beer,
  Bell,
  Boxes,
  BottleWine,
  BrushCleaning,
  Bubbles,
  Carrot,
  Check,
  ChevronRight,
  ChefHat,
  Cherry,
  ClipboardList,
  Coffee,
  CookingPot,
  Copy,
  Croissant,
  CupSoda,
  Droplet,
  Drumstick,
  Egg,
  Fish,
  GlassWater,
  Grape,
  Ham,
  History,
  HomeIcon,
  ImagePlus,
  KeyRound,
  MessageCircle,
  Milk,
  Package,
  PackageOpen,
  PillBottle,
  Plus,
  RotateCcw,
  Salad,
  Search,
  Settings,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  SoapDispenserDroplet,
  Soup,
  Sparkles,
  SprayCan,
  Sandwich,
  Toilet,
  Trash2,
  Utensils,
  UsersRound,
  WashingMachine,
  Wheat,
  Wine,
};

const legacyIconMap: Record<string, string> = {
  ["\u{1F9C2}"]: "CookingPot",
  ["\u{1F96B}"]: "Package",
  ["\u{1F35A}"]: "Wheat",
  ["\u{1F35E}"]: "Croissant",
  ["\u{1F95B}"]: "Milk",
  ["\u{1F9C3}"]: "CupSoda",
  ["\u{1F9FB}"]: "Toilet",
  ["\u{1F9FD}"]: "BrushCleaning",
  ["\u{1F9F4}"]: "SoapDispenserDroplet",
  ["\u{1FAD9}"]: "ShoppingBasket",
  SeasoningBottle: "CookingPot",
  FoodCan: "Package",
  RiceBowl: "Wheat",
  BreadLoaf: "Croissant",
  DrinkCarton: "Milk",
  GlassBottle: "CupSoda",
  DailyGoods: "SoapDispenserDroplet",
  CleaningSponge: "BrushCleaning",
  PumpBottle: "SoapDispenserDroplet",
  StorageJar: "ShoppingBasket",
};

function normalizeIconName(icon?: string | null) {
  if (!icon) return "Package";
  const mappedIcon = legacyIconMap[icon] || icon;
  return lucideIcons[mappedIcon] ? mappedIcon : "Package";
}

function AppIcon({ name, className = "size-5", strokeWidth = 2.5 }: { name: string; className?: string; strokeWidth?: number }) {
  const Icon = lucideIcons[normalizeIconName(name)] ?? Package;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

type StockItem = {
  id: string;
  name: string;
  category: Category;
  icon: string;
  status: ItemStatus;
  note: string;
  lastPurchaseMemo?: string;
  updatedBy: string;
  updatedByAvatarUrl?: string;
  updatedAt: string;
  purchaseLogs: PurchaseLog[];
};

type PurchaseLog = {
  id: string;
  volume: string;
  memo: string;
  purchasedBy: string;
  purchasedAt: string;
};

type ActivityLog = {
  id: string;
  itemName: string;
  from: ItemStatus;
  to: ItemStatus;
  changedBy: string;
  changedByAvatarUrl?: string;
  changedAt: string;
  notified: boolean;
  message: string;
};

type AppNotification = {
  id: string;
  itemName: string;
  status: "low" | "out";
  changedBy: string;
  changedAt: string;
  message: string;
};

type ShoppingNotificationItem = {
  id: string;
  itemId: string | null;
  itemName: string;
  status: "low" | "out";
  volume: string;
  memo: string;
  restocked: boolean;
};

type ShoppingNotification = {
  id: string;
  message: string;
  lineStatus: string;
  resolvedAt: string | null;
  createdAt: string;
  items: ShoppingNotificationItem[];
};

type ShoppingNotificationResolveItem = {
  id: string;
  itemId: string | null;
  restocked: boolean;
  volume: string;
  memo: string;
};

type ProfileRow = {
  id: string;
  household_id: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type HouseholdRow = {
  id: string;
  name: string;
  line_target_type: "user" | "group" | null;
  line_target_id: string | null;
  invite_code: string | null;
  category_icons: Record<string, string> | null;
};

type ItemRow = {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
  status: ItemStatus;
  note: string | null;
  last_purchase_memo: string | null;
  updated_by: string | null;
  updated_at: string;
};

type PurchaseLogRow = {
  id: string;
  item_id: string;
  volume: string | null;
  memo: string | null;
  purchased_by: string | null;
  purchased_at: string;
};

type StatusLogRow = {
  id: string;
  item_id: string;
  changed_by: string | null;
  from_status: ItemStatus | null;
  to_status: ItemStatus;
  notified: boolean;
  changed_at: string;
};

type ShoppingNotificationRow = {
  id: string;
  message: string;
  line_status: string | null;
  resolved_at: string | null;
  created_at: string;
  shopping_notification_items?: {
    id: string;
    item_id: string | null;
    item_name: string;
    status: "low" | "out";
    volume: string | null;
    memo: string | null;
    restocked: boolean;
  }[];
};

type HouseholdMember = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
};

const statusConfig: Record<
  ItemStatus,
  { label: string; short: string; chip: string; button: string }
> = {
  in_stock: {
    label: "在庫あり",
    short: "あり",
    chip: "border-[#4F9D69] bg-[#EAF6EE] text-[#4F9D69]",
    button: "border-[#4F9D69] bg-[#EAF6EE] text-[#4F9D69]",
  },
  low: {
    label: "残りわずか",
    short: "わずか",
    chip: "border-[#E8A33D] bg-[#FDF2DD] text-[#B9791C]",
    button: "border-[#E8A33D] bg-[#FDF2DD] text-[#B9791C]",
  },
  out: {
    label: "在庫切れ",
    short: "切れ",
    chip: "border-[#E4564A] bg-[#E4564A] text-white",
    button: "border-[#E4564A] bg-[#FDE9E7] text-[#E4564A]",
  },
  discontinued: {
    label: "補充しない",
    short: "補充なし",
    chip: "border-[#A49E93] bg-[#F1EFEB] text-[#7A746B]",
    button: "border-[#A49E93] bg-[#F1EFEB] text-[#7A746B]",
  },
};

const sampleItems: StockItem[] = [
  {
    id: "soy",
    name: "キッコーマン 特選丸大豆しょうゆ",
    category: "調味料",
    icon: "CookingPot",
    status: "low",
    note: "いつも丸大豆。詰め替えよりボトル派。",
    lastPurchaseMemo: "1L / いつものを購入",
    updatedBy: "ママ",
    updatedAt: "2026.05.30 09:15",
    purchaseLogs: [
      { id: "p1", volume: "1L", memo: "いつものを購入", purchasedBy: "ママ", purchasedAt: "2026.05.30" },
      { id: "p2", volume: "500ml", memo: "小さいサイズが安かった", purchasedBy: "パパ", purchasedAt: "2026.04.12" },
    ],
  },
  {
    id: "paper",
    name: "トイレットペーパー",
    category: "日用品",
    icon: "SoapDispenserDroplet",
    status: "out",
    note: "ダブル。芯なしでもOK。",
    lastPurchaseMemo: "12ロール / ダブル",
    updatedBy: "パパ",
    updatedAt: "2026.05.30 18:42",
    purchaseLogs: [
      { id: "p3", volume: "12ロール", memo: "ダブル", purchasedBy: "パパ", purchasedAt: "2026.05.10" },
    ],
  },
  {
    id: "salt",
    name: "伯方の塩",
    category: "調味料",
    icon: "CookingPot",
    status: "in_stock",
    note: "詰め替え用を優先。",
    lastPurchaseMemo: "1kg / 詰め替え",
    updatedBy: "ママ",
    updatedAt: "2026.05.29 20:01",
    purchaseLogs: [],
  },
  {
    id: "sponge",
    name: "食器用スポンジ",
    category: "日用品",
    icon: "BrushCleaning",
    status: "in_stock",
    note: "3個入りの硬め。",
    updatedBy: "ママ",
    updatedAt: "2026.05.22 08:10",
    purchaseLogs: [],
  },
  {
    id: "tea",
    name: "某メーカー麦茶",
    category: "飲料品",
    icon: "Milk",
    status: "discontinued",
    note: "補充しないもの。通常一覧では控えめ表示。",
    updatedBy: "パパ",
    updatedAt: "2026.05.20 12:12",
    purchaseLogs: [],
  },
];

const sampleLogs: ActivityLog[] = [
  {
    id: "l1",
    itemName: "トイレットペーパー",
    from: "low",
    to: "out",
    changedBy: "パパ",
    changedAt: "2026.05.30 18:42",
    notified: true,
    message: "LINE通知済み",
  },
  {
    id: "l2",
    itemName: "しょうゆ",
    from: "in_stock",
    to: "low",
    changedBy: "ママ",
    changedAt: "2026.05.30 09:15",
    notified: true,
    message: "LINE通知済み",
  },
];

const initialItems: StockItem[] = [];
const initialLogs: ActivityLog[] = [];

function screenFromPath(pathname: string): Screen {
  if (pathname === "/login") return "login";
  if (pathname === "/setup") return "setup";
  if (pathname === "/items/new") return "add";
  if (pathname.endsWith("/edit") && pathname.startsWith("/items/")) return "edit";
  if (pathname.startsWith("/items/")) return "detail";
  if (pathname === "/history") return "history";
  if (pathname === "/settings") return "settings";
  return "stock";
}

function pathForScreen(screen: Screen, selectedId: string) {
  if (screen === "login") return "/login";
  if (screen === "setup") return "/setup";
  if (screen === "add") return "/items/new";
  if (screen === "detail") return selectedId ? `/items/${selectedId}` : "/";
  if (screen === "edit") return selectedId ? `/items/${selectedId}/edit` : "/";
  if (screen === "history") return "/history";
  if (screen === "settings") return "/settings";
  return "/";
}

function nowText() {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, ".");
}

function formatDateTime(value?: string | null) {
  if (!value) return nowText();
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(value))
    .replace(/\//g, ".");
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(value))
    .replace(/\//g, ".");
}

function asCategory(value?: string | null): Category {
  if (value === "飲料") return "飲料品";
  if (categories.includes(value as Category)) return value as Category;
  return "その他";
}

function normalizeCategoryIcons(value?: Record<string, string> | null): CategoryIcons {
  return categories.reduce<CategoryIcons>(
    (acc, category) => {
      const normalizedIcon = normalizeIconName(value?.[category] || (category === "飲料品" ? value?.["飲料"] : "") || defaultCategoryIcons[category]);
      acc[category] = category === categories[4] && normalizedIcon === "Boxes" ? "ShoppingBasket" : normalizedIcon;
      return acc;
    },
    { ...defaultCategoryIcons },
  );
}

function getCategoryIcon(category: Category, icons: CategoryIcons) {
  return normalizeIconName(icons[category] || defaultCategoryIcons[category]);
}

function buildLineMessage(status: ItemStatus, item: StockItem) {
  const memoLine = item.lastPurchaseMemo ? `\nいつもの容量：${item.lastPurchaseMemo}` : "";

  if (status === "low") {
    return `🟡 在庫がのこりわずかです\n\n商品：${item.name}${memoLine}\n\nお買い物のときに補充をお願いします`;
  }

  if (status === "out") {
    return `🔴【至急】在庫が切れました\n\n商品：${item.name}${memoLine}\n\n今日買えると助かります。買えそうな人はお願いします`;
  }

  return "";
}

export default function Home() {
  const pathname = usePathname();
  const [screen, setScreen] = useState<Screen>(() => screenFromPath(pathname));
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [household, setHousehold] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [lineTargetType, setLineTargetType] = useState<"user" | "group" | null>(null);
  const [lineTargetId, setLineTargetId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileAvatarDraft, setProfileAvatarDraft] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState(isSupabaseConfigured ? "" : `${supabaseConfigError}。.env.localを確認してください`);
  const [items, setItems] = useState(initialItems);
  const [logs, setLogs] = useState(initialLogs);
  const [shoppingNotifications, setShoppingNotifications] = useState<ShoppingNotification[]>([]);
  const [categoryIcons, setCategoryIcons] = useState<CategoryIcons>(defaultCategoryIcons);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(() => {
    const match = pathname.match(/^\/items\/([^/]+)/);
    return match?.[1] === "new" ? "" : match?.[1] ?? "";
  });
  const [restockId, setRestockId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockItem | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ itemId: string; to: ItemStatus } | null>(null);
  const [batchNotifyConfirmOpen, setBatchNotifyConfirmOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<Record<string, number>>({});
  const notificationLocksRef = useRef<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", category: "調味料" as Category, note: "" });
  const [editForm, setEditForm] = useState({ name: "", category: "調味料" as Category, note: "" });
  const isLoggedIn = Boolean(authUser);
  const lineConnected = Boolean(lineTargetId);
  const notificationStorageKey = authUser?.id && householdId ? `nainai-notifications-read:${householdId}:${authUser.id}` : "";

  const loadHouseholdData = useCallback(async (user: User) => {
    if (!supabase) return;

    const displayName = user.email?.split("@")[0] || "あなた";
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, household_id, display_name, email, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setToast(`プロフィール取得に失敗しました: ${profileError.message}`);
      return;
    }

    let profile = profileData as ProfileRow | null;
    if (!profile) {
      const { data: insertedProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, display_name: displayName, email: user.email ?? null })
        .select("id, household_id, display_name, email, avatar_url")
        .single();

      if (insertError) {
        setToast(`プロフィール作成に失敗しました: ${insertError.message}`);
        return;
      }
      profile = insertedProfile as ProfileRow;
    }
    const currentDisplayName = profile.display_name || profile.email?.split("@")[0] || "あなた";
    const currentAvatarUrl = profile.avatar_url || "";
    setDisplayName(currentDisplayName);
    setDisplayNameDraft(currentDisplayName);
    setProfileAvatarUrl(currentAvatarUrl);
    setProfileAvatarDraft(currentAvatarUrl);

    if (!profile.household_id) {
      setHouseholdId(null);
      setHousehold("");
      setInviteCode("");
      setLineTargetType(null);
      setLineTargetId(null);
      setMembers([]);
      setReadNotificationIds([]);
      setNotificationPanelOpen(false);
      setItems([]);
      setLogs([]);
      setShoppingNotifications([]);
      setScreen("setup");
      setToast("世帯を作成または招待コードで参加してください");
      return;
    }

    const { data: householdData, error: householdError } = await supabase
      .from("households")
      .select("id, name, line_target_type, line_target_id, invite_code, category_icons")
      .eq("id", profile.household_id)
      .single();

    if (householdError) {
      setToast(`世帯情報の取得に失敗しました: ${householdError.message}`);
      return;
    }

    const householdRow = householdData as HouseholdRow;
    setHouseholdId(householdRow.id);
    setHousehold(householdRow.name);
    setInviteCode(householdRow.invite_code ?? "");
    setLineTargetType(householdRow.line_target_type);
    setLineTargetId(householdRow.line_target_id);
    const storedReadNotifications = window.localStorage.getItem(`nainai-notifications-read:${householdRow.id}:${user.id}`);
    setReadNotificationIds(storedReadNotifications ? (JSON.parse(storedReadNotifications) as string[]) : []);
    const nextCategoryIcons = normalizeCategoryIcons(householdRow.category_icons);
    setCategoryIcons(nextCategoryIcons);

    const [{ data: memberData }, { data: itemData, error: itemError }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, email, avatar_url").eq("household_id", householdRow.id),
      supabase
        .from("items")
        .select("id, name, category, icon, status, note, last_purchase_memo, updated_by, updated_at")
        .order("updated_at", { ascending: false }),
    ]);

    if (itemError) {
      setToast(`アイテム取得に失敗しました: ${itemError.message}`);
      return;
    }

    const memberProfiles = (memberData ?? []) as ProfileRow[];
    const members = memberProfiles.reduce<Record<string, { displayName: string; avatarUrl: string }>>((acc, member) => {
      acc[member.id] = {
        displayName: member.display_name || member.email?.split("@")[0] || "家族",
        avatarUrl: member.avatar_url || "",
      };
      return acc;
    }, {});
    setMembers(
      memberProfiles.map((member) => ({
        id: member.id,
        displayName: member.display_name || member.email?.split("@")[0] || "家族",
        email: member.email ?? "",
        avatarUrl: member.avatar_url || "",
      })),
    );
    const itemRows = (itemData ?? []) as ItemRow[];
    const itemIds = itemRows.map((item) => item.id);

    const [{ data: purchaseData }, { data: statusData }] = itemIds.length
      ? await Promise.all([
          supabase
            .from("purchase_logs")
            .select("id, item_id, volume, memo, purchased_by, purchased_at")
            .in("item_id", itemIds)
            .order("purchased_at", { ascending: false }),
          supabase
            .from("status_change_logs")
            .select("id, item_id, changed_by, from_status, to_status, notified, changed_at")
            .in("item_id", itemIds)
            .order("changed_at", { ascending: false })
            .limit(80),
        ])
      : [{ data: [] }, { data: [] }];
    const { data: shoppingNotificationData } = await supabase
      .from("shopping_notifications")
      .select("id, message, line_status, resolved_at, created_at, shopping_notification_items(id, item_id, item_name, status, volume, memo, restocked)")
      .eq("household_id", householdRow.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const purchases = (purchaseData ?? []) as PurchaseLogRow[];
    const nextItems = itemRows.map<StockItem>((item) => ({
      id: item.id,
      name: item.name,
      category: asCategory(item.category),
      icon: getCategoryIcon(asCategory(item.category), nextCategoryIcons),
      status: item.status,
      note: item.note ?? "",
      lastPurchaseMemo: item.last_purchase_memo ?? undefined,
      updatedBy: item.updated_by ? members[item.updated_by]?.displayName || "家族" : "家族",
      updatedByAvatarUrl: item.updated_by ? members[item.updated_by]?.avatarUrl || "" : "",
      updatedAt: formatDateTime(item.updated_at),
      purchaseLogs: purchases
        .filter((purchase) => purchase.item_id === item.id)
        .map((purchase) => ({
          id: purchase.id,
          volume: purchase.volume ?? "",
          memo: purchase.memo ?? "",
          purchasedBy: purchase.purchased_by ? members[purchase.purchased_by]?.displayName || "家族" : "家族",
          purchasedAt: formatDate(purchase.purchased_at),
        })),
    }));

    const itemNames = nextItems.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
    const statusRows = (statusData ?? []) as StatusLogRow[];
    const shoppingNotificationRows = (shoppingNotificationData ?? []) as ShoppingNotificationRow[];
    setItems(nextItems);
    setLogs(
      statusRows.map((log) => ({
        id: log.id,
        itemName: itemNames[log.item_id] || "削除済みアイテム",
        from: log.from_status ?? log.to_status,
        to: log.to_status,
        changedBy: log.changed_by ? members[log.changed_by]?.displayName || "家族" : "家族",
        changedByAvatarUrl: log.changed_by ? members[log.changed_by]?.avatarUrl || "" : "",
        changedAt: formatDateTime(log.changed_at),
        notified: log.notified,
        message: log.notified ? "LINE通知済み" : "通知なし",
      })),
    );
    setShoppingNotifications(
      shoppingNotificationRows.map((notification) => ({
        id: notification.id,
        message: notification.message,
        lineStatus: notification.line_status || "",
        resolvedAt: notification.resolved_at ? formatDateTime(notification.resolved_at) : null,
        createdAt: formatDateTime(notification.created_at),
        items: (notification.shopping_notification_items ?? []).map((item) => ({
          id: item.id,
          itemId: item.item_id,
          itemName: item.item_name,
          status: item.status,
          volume: item.volume ?? "",
          memo: item.memo ?? "",
          restocked: item.restocked,
        })),
      })),
    );
    setToast("");
  }, []);

  useEffect(() => {
    const onPopState = () => setScreen(screenFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const user = data.session?.user ?? null;
      setAuthUser(user);
      if (user) await loadHouseholdData(user);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      if (user) {
        void loadHouseholdData(user);
      } else {
        setHouseholdId(null);
        setHousehold("");
        setInviteCode("");
        setLineTargetType(null);
        setLineTargetId(null);
        setMembers([]);
        setDisplayName("");
        setDisplayNameDraft("");
        setProfileAvatarUrl("");
        setProfileAvatarDraft("");
        setCategoryIcons(defaultCategoryIcons);
        setReadNotificationIds([]);
        setNotificationPanelOpen(false);
        setItems([]);
        setLogs([]);
        setShoppingNotifications([]);
        setScreen("login");
      }
      setAuthLoading(false);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [loadHouseholdData]);

  const effectiveScreen: Screen = !isLoggedIn
    ? "login"
    : screen === "login"
      ? household
        ? "stock"
        : "setup"
      : !household
        ? "setup"
        : screen;

  useEffect(() => {
    const nextPath = pathForScreen(effectiveScreen, selectedId);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  }, [effectiveScreen, selectedId]);

  const selectedItem = items.find((item) => item.id === selectedId);
  const restockItem = restockId ? items.find((item) => item.id === restockId) : null;
  const statusConfirmItem = statusConfirm ? items.find((item) => item.id === statusConfirm.itemId) : null;

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "needs") return item.status === "low" || item.status === "out";
      if (filter === "all") return true;
      return item.category === filter;
    });
  }, [filter, items]);

  const needCount = items.filter((item) => item.status === "low" || item.status === "out").length;
  const categoryCounts = useMemo(() => {
    return items.reduce<Record<Category, number>>(
      (acc, item) => {
        acc[item.category] += 1;
        return acc;
      },
      { 調味料: 0, 食料品: 0, 日用品: 0, 飲料品: 0, その他: 0 },
    );
  }, [items]);
  const appNotifications = useMemo<AppNotification[]>(() => {
    return logs
      .filter((log) => log.to === "low" || log.to === "out")
      .map((log) => ({
        id: log.id,
        itemName: log.itemName,
        status: log.to as "low" | "out",
        changedBy: log.changedBy,
        changedAt: log.changedAt,
        message: log.to === "out" ? "在庫切れになりました" : "残りわずかになりました",
      }));
  }, [logs]);
  const unreadNotificationCount = appNotifications.filter((notification) => !readNotificationIds.includes(notification.id)).length;
  const batchNotifyCount = items.filter((item) => item.status === "low" || item.status === "out").length;

  function requireLogin(next: Screen) {
    if (!isLoggedIn) {
      setScreen("login");
      setToast("未ログインでは在庫画面にアクセスできません");
      return;
    }
    if (!household && next !== "setup") {
      setScreen("setup");
      setToast("先に世帯を作成または参加してください");
      return;
    }
    setScreen(next);
  }

  function openNotifications() {
    setNotificationPanelOpen(true);
  }

  function markNotificationAsRead(notificationId: string) {
    setReadNotificationIds((currentReadIds) => {
      if (currentReadIds.includes(notificationId)) return currentReadIds;
      const nextReadIds = [...currentReadIds, notificationId];
      if (notificationStorageKey) {
        window.localStorage.setItem(notificationStorageKey, JSON.stringify(nextReadIds));
      }
      return nextReadIds;
    });
  }

  async function sendBatchNotification() {
    if (!supabase || !authUser) return;
    setBatchNotifyConfirmOpen(false);
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/notify/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
      },
    }).catch(() => null);
    const result = response ? ((await response.json().catch(() => null)) as { ok?: boolean; itemCount?: number; notified?: boolean; reason?: string } | null) : null;
    if (!result?.ok) {
      setToast("まとめてLINE通知に失敗しました");
      return;
    }
    await loadHouseholdData(authUser);
    setToast(result.itemCount ? "" : "通知対象のアイテムがありません");
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setToast(supabaseConfigError || "Supabase環境変数が未設定です");
      return;
    }

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (!email || !password) {
      setToast("メールアドレスとパスワードを入力してください");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password }).catch((error: unknown) => ({
      error: error instanceof Error ? error : new Error("ログイン通信に失敗しました"),
    }));
    if (error) {
      setToast(`ログインに失敗しました: ${error.message}`);
      return;
    }
    setToast("");
  }

  async function signUp(email: string, password: string) {
    if (!supabase) {
      setToast(supabaseConfigError || "Supabase環境変数が未設定です");
      return;
    }
    if (!email.trim() || !password) {
      setToast("メールアドレスとパスワードを入力してください");
      return;
    }

    const { error } = await supabase.auth
      .signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      .catch((error: unknown) => ({
        error: error instanceof Error ? error : new Error("登録通信に失敗しました"),
      }));

    if (error) {
      setToast(`登録に失敗しました: ${error.message}`);
      return;
    }

    setToast("");
  }

  async function sendMagicLink(email: string) {
    if (!supabase) {
      setToast(supabaseConfigError || "Supabase環境変数が未設定です");
      return;
    }
    if (!email.trim()) {
      setToast("メールアドレスを入力してください");
      return;
    }

    const { error } = await supabase.auth
      .signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      .catch((error: unknown) => ({
        error: error instanceof Error ? error : new Error("マジックリンク送信通信に失敗しました"),
      }));
    setToast(error ? `マジックリンク送信に失敗しました: ${error.message}` : "");
  }

  async function setupHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !authUser) {
      setToast("ログイン後に世帯を作成してください");
      return;
    }
    const data = new FormData(event.currentTarget);
    const name = String(data.get("household") || "").trim();
    const invite = String(data.get("inviteCode") || "").trim();
    const action = String(data.get("setupAction") || "");
    if (action === "create" && !name) {
      setToast("世帯名を入力してください");
      return;
    }
    if (action === "join" && !invite) {
      setToast("招待コードを入力してください");
      return;
    }
    if (!name && !invite) {
      setToast("世帯名または招待コードを入力してください");
      return;
    }

    if (invite) {
      const { error } = await supabase.rpc("join_household_by_invite", { code: invite });
      if (error) {
        setToast(`招待コードで参加できませんでした: ${error.message}`);
        return;
      }
      await loadHouseholdData(authUser);
      setScreen("stock");
      return;
    }

    const { data: householdData, error: householdError } = await supabase
      .from("households")
      .insert({ name, created_by: authUser.id })
      .select("id, name, line_target_type, line_target_id, invite_code, category_icons")
      .single();

    if (householdError) {
      setToast(`世帯作成に失敗しました: ${householdError.message}`);
      return;
    }

    const householdRow = householdData as HouseholdRow;
    const { error: updateError } = await supabase.from("profiles").update({ household_id: householdRow.id }).eq("id", authUser.id);
    if (updateError) {
      setToast(`プロフィール更新に失敗しました: ${updateError.message}`);
      return;
    }

    await loadHouseholdData(authUser);
    setScreen("stock");
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !authUser || !householdId) {
      setToast("世帯作成後にアイテムを登録してください");
      return;
    }
    if (!form.name.trim()) {
      setToast("アイテム名を入力してください");
      return;
    }

    const { error } = await supabase.from("items").insert({
      household_id: householdId,
      name: form.name.trim(),
      category: form.category,
      icon: getCategoryIcon(form.category, categoryIcons),
      status: "in_stock",
      note: form.note,
      updated_by: authUser.id,
    });

    if (error) {
      setToast(`アイテム登録に失敗しました: ${error.message}`);
      return;
    }

    await loadHouseholdData(authUser);
    setForm({ name: "", category: "調味料", note: "" });
    setScreen("stock");
    setToast("");
  }

  function loadSampleData() {
    setItems(sampleItems);
    setLogs(sampleLogs);
    setSelectedId(sampleItems[0]?.id ?? "");
    setToast("");
  }

  function startEdit(item: StockItem) {
    setSelectedId(item.id);
    setEditForm({ name: item.name, category: item.category, note: item.note });
    setScreen("edit");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !authUser) return;
    if (!editForm.name.trim()) {
      setToast("アイテム名を入力してください");
      return;
    }
    const item = items.find((target) => target.id === selectedId);
    if (!item) return;

    const { error } = await supabase
      .from("items")
      .update({
        name: editForm.name.trim(),
        category: editForm.category,
        icon: getCategoryIcon(editForm.category, categoryIcons),
        note: editForm.note,
        updated_by: authUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setToast(`アイテム更新に失敗しました: ${error.message}`);
      return;
    }

    await loadHouseholdData(authUser);
    setScreen("detail");
    setToast("");
  }

  async function deleteItem(item: StockItem) {
    if (!supabase || !authUser) return;
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) {
      setToast(`アイテム削除に失敗しました: ${error.message}`);
      return;
    }
    setDeleteTarget(null);
    setSelectedId((current) => (current === item.id ? items.find((target) => target.id !== item.id)?.id ?? "" : current));
    await loadHouseholdData(authUser);
    setScreen("stock");
    setToast("");
  }

  function requestStatusChange(itemId: string, to: ItemStatus) {
    const item = items.find((target) => target.id === itemId);
    if (!item || item.status === to) return;
    if (to === "in_stock" && (item.status === "low" || item.status === "out")) {
      setRestockId(itemId);
      return;
    }
    setStatusConfirm({ itemId, to });
  }

  async function confirmStatusChange() {
    if (!statusConfirm) return;
    const pending = statusConfirm;
    setStatusConfirm(null);
    await changeStatus(pending.itemId, pending.to, false);
  }

  async function changeStatus(itemId: string, to: ItemStatus, notifyLine = false) {
    if (!supabase || !authUser) return;
    const item = items.find((target) => target.id === itemId);
    if (!item || item.status === to) return;
    if (to === "in_stock" && (item.status === "low" || item.status === "out")) {
      setRestockId(itemId);
      return;
    }

    const updatedAt = nowText();
    const nextItem = { ...item, status: to, updatedBy: displayName || "あなた", updatedAt };
    const message = to === "out" ? buildLineMessage(to, nextItem) : "";
    const key = `${itemId}:${to}`;
    const lastSent = recentNotifications[key] ?? 0;
    const deduped = Date.now() - lastSent < 10 * 60 * 1000;
    const shouldTryNotify = notifyLine && to === "out" && Boolean(lineTargetId) && !deduped;
    if (shouldTryNotify) {
      if (notificationLocksRef.current.has(key)) {
        setToast("LINE通知を送信中です。少し待ってから操作してください");
        return;
      }
      notificationLocksRef.current.add(key);
    }
    let notified = false;
    let reason = !message
      ? "通知なし"
      : !lineTargetId
        ? "LINE未連携のため通知スキップ"
        : deduped
          ? "直近10分の重複通知を抑制"
          : "LINE通知を送信中";

    const { error: updateError } = await supabase
      .from("items")
      .update({ status: to, updated_by: authUser.id, updated_at: new Date().toISOString() })
      .eq("id", itemId);
    if (updateError) {
      if (shouldTryNotify) notificationLocksRef.current.delete(key);
      setToast(`ステータス更新に失敗しました: ${updateError.message}`);
      return;
    }

    if (shouldTryNotify && lineTargetId) {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({ itemId, status: to }),
      }).catch(() => null);
      const result = response ? ((await response.json().catch(() => null)) as { notified?: boolean; dryRun?: boolean; reason?: string } | null) : null;
      notified = Boolean(result?.notified);
      reason = notified
        ? "LINE通知済み"
        : result?.dryRun
          ? "LINEトークン未設定のため通知はdry-runです"
          : `LINE通知に失敗しました${result?.reason ? `: ${result.reason}` : ""}`;
    }

    if (shouldTryNotify) notificationLocksRef.current.delete(key);

    await supabase.from("status_change_logs").insert({
      item_id: itemId,
      changed_by: authUser.id,
      from_status: item.status,
      to_status: to,
      notified,
    });

    if (notified) setRecentNotifications((current) => ({ ...current, [key]: Date.now() }));
    await loadHouseholdData(authUser);
    setToast(reason === "通知なし" || reason === "LINE通知済み" ? "" : reason);
  }

  async function restock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !authUser) return;
    if (!restockItem) return;
    const data = new FormData(event.currentTarget);
    const mode = String(data.get("restockMode") || "save");
    const volume = mode === "none" ? "" : String(data.get("volume") || "");
    const memo = mode === "none" ? "" : String(data.get("memo") || "");
    const purchaseMemo = [volume, memo].filter(Boolean).join(" / ");

    if (purchaseMemo) {
      await supabase.from("purchase_logs").insert({
        item_id: restockItem.id,
        purchased_by: authUser.id,
        volume,
        memo,
      });
    }

    const { error: updateError } = await supabase
      .from("items")
      .update({
        status: "in_stock",
        last_purchase_memo: purchaseMemo || restockItem.lastPurchaseMemo || null,
        updated_by: authUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restockItem.id);

    if (updateError) {
      setToast(`補充記録に失敗しました: ${updateError.message}`);
      return;
    }

    await supabase.from("status_change_logs").insert({
      item_id: restockItem.id,
      changed_by: authUser.id,
      from_status: restockItem.status,
      to_status: "in_stock",
      notified: false,
    });

    await loadHouseholdData(authUser);
    setRestockId(null);
    setToast("");
  }

  async function resolveShoppingNotification(notificationId: string, updates: ShoppingNotificationResolveItem[]) {
    if (!supabase || !authUser) return;

    for (const update of updates) {
      const { error } = await supabase
        .from("shopping_notification_items")
        .update({
          restocked: update.restocked,
          volume: update.volume.trim() || null,
          memo: update.memo.trim() || null,
        })
        .eq("id", update.id);

      if (error) {
        setToast(`通知履歴の更新に失敗しました: ${error.message}`);
        return;
      }
    }

    for (const update of updates.filter((item) => item.restocked && item.itemId)) {
      const currentItem = items.find((item) => item.id === update.itemId);
      const purchaseMemo = [update.volume.trim(), update.memo.trim()].filter(Boolean).join(" / ");

      if (purchaseMemo) {
        const { error: purchaseError } = await supabase.from("purchase_logs").insert({
          item_id: update.itemId,
          purchased_by: authUser.id,
          volume: update.volume.trim(),
          memo: update.memo.trim(),
        });

        if (purchaseError) {
          setToast(`購入メモの保存に失敗しました: ${purchaseError.message}`);
          return;
        }
      }

      const { error: itemError } = await supabase
        .from("items")
        .update({
          status: "in_stock",
          last_purchase_memo: purchaseMemo || currentItem?.lastPurchaseMemo || null,
          updated_by: authUser.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", update.itemId);

      if (itemError) {
        setToast(`在庫ステータスの更新に失敗しました: ${itemError.message}`);
        return;
      }

      if (currentItem?.status && currentItem.status !== "in_stock") {
        await supabase.from("status_change_logs").insert({
          item_id: update.itemId,
          changed_by: authUser.id,
          from_status: currentItem.status,
          to_status: "in_stock",
          notified: false,
        });
      }
    }

    const { error: notificationError } = await supabase
      .from("shopping_notifications")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (notificationError) {
      setToast(`通知履歴の解決に失敗しました: ${notificationError.message}`);
      return;
    }

    await loadHouseholdData(authUser);
    setToast("");
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setToast("");
  }

  async function saveDisplayName(nextName: string, nextAvatarUrl = profileAvatarDraft) {
    if (!supabase || !authUser) return;
    const trimmed = nextName.trim();
    if (!trimmed) {
      setToast("表示名を入力してください");
      return;
    }

    const { error } = await supabase.from("profiles").update({ display_name: trimmed, avatar_url: nextAvatarUrl || null }).eq("id", authUser.id);
    if (error) {
      setToast(`表示名の更新に失敗しました: ${error.message}`);
      return;
    }

    setDisplayName(trimmed);
    setDisplayNameDraft(trimmed);
    setProfileAvatarUrl(nextAvatarUrl || "");
    setProfileAvatarDraft(nextAvatarUrl || "");
    await loadHouseholdData(authUser);
    setToast("");
  }

  async function saveCategoryIcons(nextIcons: CategoryIcons) {
    if (!supabase || !householdId) return;
    const normalized = normalizeCategoryIcons(nextIcons);
    const { error } = await supabase.from("households").update({ category_icons: normalized }).eq("id", householdId);
    if (error) {
      setToast(`カテゴリ別アイコンの保存に失敗しました: ${error.message}`);
      return;
    }

    setCategoryIcons(normalized);
    setItems((current) =>
      current.map((item) => ({
        ...item,
        icon: getCategoryIcon(item.category, normalized),
      })),
    );
    setToast("");
  }

  async function setLineConnected(connected: boolean) {
    if (!supabase || !householdId) return;
    if (!connected) {
      const { error } = await supabase.from("households").update({ line_target_type: null, line_target_id: null }).eq("id", householdId);
      if (error) {
        setToast(`LINE連携解除に失敗しました: ${error.message}`);
        return;
      }
      setLineTargetType(null);
      setLineTargetId(null);
      setToast("");
      return;
    }
    setToast("LINE連携はLINE Botの友だち追加またはグループ招待後に有効になります");
  }

  return (
    <main className="min-h-screen bg-[#FBF6EC] text-[#33312E]">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_12%_8%,#FFF3E2_0,transparent_42%),radial-gradient(circle_at_88%_4%,#EEF3E2_0,transparent_38%)]" />
      <div className={`relative z-10 mx-auto flex min-h-screen w-full flex-col ${isLoggedIn && household ? "md:block" : "px-4 py-4 md:px-6"}`}>
        {isLoggedIn && household ? (
          <div className="hidden md:block">
            <DesktopShell screen={effectiveScreen} go={requireLogin} household={household} displayName={displayName} avatarUrl={profileAvatarUrl} />
          </div>
        ) : null}

        {effectiveScreen !== "login" ? (
          <div className={isLoggedIn && household ? "md:hidden" : ""}>
            <AppHeader
              isLoggedIn={isLoggedIn}
              household={household}
              lineConnected={lineConnected}
              unreadNotificationCount={unreadNotificationCount}
              onNotifications={openNotifications}
              onSettings={() => requireLogin("settings")}
            />
            <div className="h-[73px] md:hidden" aria-hidden="true" />
          </div>
        ) : null}

        <section className={isLoggedIn && household ? "flex-1 px-4 py-4 pb-20 md:ml-[210px] md:px-[26px] md:py-[22px]" : "grid flex-1 place-items-center"}>
          {authLoading ? <div className="card">読み込み中...</div> : null}
          {!authLoading && effectiveScreen === "login" && <LoginView onSubmit={login} onSignUp={signUp} onMagicLink={sendMagicLink} />}
          {effectiveScreen === "setup" && <SetupView onSubmit={setupHousehold} />}
          {effectiveScreen === "stock" && (
            <StockView
              household={household}
              items={visibleItems}
              totalCount={items.length}
              needCount={needCount}
              batchNotifyCount={batchNotifyCount}
              categoryCounts={categoryCounts}
              categoryIcons={categoryIcons}
              filter={filter}
              setFilter={setFilter}
              onAdd={() => requireLogin("add")}
              onDetail={(id) => {
                setSelectedId(id);
                requireLogin("detail");
              }}
              onStatus={requestStatusChange}
              onBatchNotify={() => setBatchNotifyConfirmOpen(true)}
              onLoadSample={loadSampleData}
            />
          )}
          {effectiveScreen === "add" && <AddItemView form={form} setForm={setForm} categoryIcons={categoryIcons} onSubmit={addItem} onCancel={() => setScreen("stock")} />}
          {effectiveScreen === "detail" && selectedItem ? (
            <DetailView
              item={selectedItem}
              onBack={() => setScreen("stock")}
              onEdit={() => startEdit(selectedItem)}
              onDelete={() => setDeleteTarget(selectedItem)}
              onStatus={requestStatusChange}
              onRestock={() => setRestockId(selectedItem.id)}
            />
          ) : null}
          {effectiveScreen === "edit" && selectedItem ? (
            <EditItemView
              form={editForm}
              setForm={setEditForm}
              categoryIcons={categoryIcons}
              onSubmit={saveEdit}
              onCancel={() => setScreen("detail")}
              onDelete={() => setDeleteTarget(selectedItem)}
            />
          ) : null}
          {effectiveScreen === "detail" && !selectedItem ? <MissingItemView onBack={() => setScreen("stock")} /> : null}
          {effectiveScreen === "edit" && !selectedItem ? <MissingItemView onBack={() => setScreen("stock")} /> : null}
          {effectiveScreen === "history" && (
            <HistoryHubView
              logs={logs}
              shoppingNotifications={shoppingNotifications}
              onResolveShoppingNotification={resolveShoppingNotification}
            />
          )}
          {effectiveScreen === "settings" && (
            <SettingsView
              household={household}
              inviteCode={inviteCode}
              members={members}
              displayNameDraft={displayNameDraft}
              setDisplayNameDraft={setDisplayNameDraft}
              profileAvatarDraft={profileAvatarDraft}
              setProfileAvatarDraft={setProfileAvatarDraft}
              categoryIcons={categoryIcons}
              lineConnected={lineConnected}
              lineTargetType={lineTargetType}
              lineFriendUrl={lineFriendUrl}
              setLineConnected={setLineConnected}
              onSaveDisplayName={saveDisplayName}
              onSaveCategoryIcons={saveCategoryIcons}
              onLogout={logout}
            />
          )}
        </section>

        {isLoggedIn && household ? <MobileNav screen={effectiveScreen} go={requireLogin} /> : null}
        {toast ? <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-center text-xs font-bold shadow-[0_10px_30px_rgba(80,60,30,.16)] md:bottom-6">{toast}</div> : null}
        {restockItem ? <RestockModal item={restockItem} onSubmit={restock} onClose={() => setRestockId(null)} /> : null}
        {notificationPanelOpen ? (
          <NotificationPanel
            notifications={appNotifications}
            readNotificationIds={readNotificationIds}
            onRead={markNotificationAsRead}
            onClose={() => setNotificationPanelOpen(false)}
          />
        ) : null}
        {batchNotifyConfirmOpen ? (
          <BatchNotifyConfirmModal count={batchNotifyCount} onConfirm={sendBatchNotification} onClose={() => setBatchNotifyConfirmOpen(false)} />
        ) : null}
        {statusConfirm && statusConfirmItem ? (
          <StatusConfirmModal
            item={statusConfirmItem}
            to={statusConfirm.to}
            onConfirm={confirmStatusChange}
            onConfirmWithLine={async () => {
              const pending = statusConfirm;
              setStatusConfirm(null);
              await changeStatus(pending.itemId, pending.to, true);
            }}
            onClose={() => setStatusConfirm(null)}
          />
        ) : null}
        {deleteTarget ? <DeleteConfirmModal item={deleteTarget} onDelete={() => deleteItem(deleteTarget)} onClose={() => setDeleteTarget(null)} /> : null}
      </div>
    </main>
  );
}

function AppHeader({
  isLoggedIn,
  household,
  lineConnected,
  unreadNotificationCount,
  onNotifications,
  onSettings,
}: {
  isLoggedIn: boolean;
  household: string;
  lineConnected: boolean;
  unreadNotificationCount: number;
  onNotifications: () => void;
  onSettings: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 border-b border-[#E7DCC6] bg-[#FBF6EC] px-4 py-[14px] shadow-[0_6px_18px_rgba(80,60,30,0.08)] md:hidden">
      <LogoMark imageScale="scale-[1.4]" />
      <div>
        <p className="font-[var(--font-outfit)] text-base font-extrabold leading-none tracking-[.04em]">NaiNai Alert<span className="text-[#E0734D]">.</span></p>
        <p className="mt-1 text-[11px] font-bold text-[#7A746B]">{household || "家族の在庫を、ひとつの場所で。"}</p>
      </div>
      {isLoggedIn ? (
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onSettings}
            className={`rounded-xl border-2 px-3 py-2 font-[var(--font-outfit)] text-base font-extrabold leading-none tracking-[.04em] ${
              lineConnected ? "border-[#05A648] bg-[#06C755] text-white" : "border-[#2B2A27] bg-white text-[#33312E]"
            }`}
          >
            {lineConnected ? <><Check className="mr-1 inline size-3.5" strokeWidth={3} aria-hidden="true" />連携済み</> : "LINE未連携"}
          </button>
          <button
            type="button"
            onClick={onNotifications}
            aria-label={`通知 ${unreadNotificationCount}件`}
            className="relative grid size-10 place-items-center rounded-xl border-2 border-[#2B2A27] bg-[#E0734D] text-lg font-extrabold text-white"
          >
            <Bell className="size-5" strokeWidth={2.5} aria-hidden="true" />
            {unreadNotificationCount ? (
              <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full border-2 border-white bg-[#E4564A] px-1 text-[10px] font-black leading-4 text-white">
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
    </header>
  );
}

function DesktopShell({ screen, go, household, displayName, avatarUrl }: { screen: Screen; go: (screen: Screen) => void; household: string; displayName: string; avatarUrl: string }) {
  const nav = [
    ["stock", "ClipboardList", "在庫一覧"],
    ["add", "Plus", "アイテム登録"],
    ["history", "History", "変更履歴"],
    ["settings", "Settings", "設定 / LINE"],
  ] as const;

  return (
    <aside className="fixed bottom-0 left-0 top-0 w-[210px] border-r border-[#E7DCC6] bg-white px-3 py-4">
      <div className="mb-2 flex items-center gap-2 px-2 pb-[14px] pt-1 font-[var(--font-outfit)] text-base font-extrabold">
        <LogoMark small /> NaiNai<span className="text-[#E0734D]">.</span>
      </div>
      <nav className="space-y-1">
        {nav.map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => go(id)}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold ${
              screen === id ? "border border-[#E0734D] bg-[#FFF1E6] text-[#C75B38]" : "text-[#7A746B]"
            }`}
          >
            <AppIcon name={icon} className="size-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 border-t border-[#E7DCC6] pt-3 text-xs">
        <Avatar name={displayName || "あなた"} avatarUrl={avatarUrl} size="sm" />
        <span><b>{displayName || "あなた"}</b><br /><span className="text-[#7A746B]">{household}</span></span>
      </div>
    </aside>
  );
}

function LoginView({
  onSubmit,
  onSignUp,
  onMagicLink,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignUp: (email: string, password: string) => void;
  onMagicLink: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const title = mode === "login" ? "ログイン" : "新規登録";

  return (
    <div className="w-full max-w-5xl">
      <section className="grid overflow-hidden bg-transparent md:grid-cols-[1fr_390px]">
        <div className="hidden min-h-[560px] flex-col items-center justify-center gap-4 bg-[linear-gradient(135deg,#F7E2C8,#EAE8C9)] px-6 py-10 text-center md:flex">
          <LogoMark hero />
          <div>
            <h1 className="font-[var(--font-outfit)] text-3xl font-extrabold tracking-[.04em] md:text-4xl">
              NaiNai Alert<span className="text-[#E0734D]">.</span>
            </h1>
            <p className="mt-3 text-sm font-extrabold leading-7 text-[#5F594E]">
              「あれ、醤油あったっけ？」を<br className="hidden sm:block" />家族みんなで解決。
            </p>
          </div>
          <div className="flex gap-2 text-xl" aria-hidden="true">🧂 🧴 🧻 🥫</div>
        </div>

        <form
          onSubmit={(event) => {
            if (mode === "login") {
              onSubmit(event);
              return;
            }
            event.preventDefault();
            onSignUp(email, password);
          }}
          className="mx-auto flex w-full max-w-[340px] flex-col justify-center px-2 py-10 text-center md:max-w-none md:bg-[#FFFBF4] md:px-10 md:text-left"
        >
          <div className="mb-8 md:hidden">
            <LogoMark large />
            <h1 className="mt-5 font-[var(--font-outfit)] text-2xl font-extrabold tracking-[.04em]">
              NaiNai Alert<span className="text-[#E0734D]">.</span>
            </h1>
            <p className="mt-3 text-xs font-bold text-[#7A746B]">家族の在庫を、ひとつの場所で。</p>
          </div>

          <Overline>{mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}</Overline>
          <h2 className="heading">{title}</h2>
          <Field label="メールアドレス"><input name="email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></Field>
          <Field label="パスワード"><input name="password" className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></Field>
          {mode === "login" ? (
            <>
              <a
                href="/forgot-password"
                className="mb-3 self-end text-[11px] font-extrabold text-[#7A746B] underline decoration-[#E7DCC6] underline-offset-4"
              >
                パスワードを忘れた方
              </a>
              <button className="btn-primary mt-1 w-full">ログイン <span className="font-[var(--font-outfit)] text-xs opacity-70">LOGIN</span></button>
            </>
          ) : (
            <button className="btn-primary mt-1 w-full">登録する <span className="font-[var(--font-outfit)] text-xs opacity-70">SIGN UP</span></button>
          )}
          <div className="my-4 text-[11px] font-bold text-[#7A746B]">— または —</div>
          <button type="button" onClick={() => onMagicLink(email)} className="min-h-12 w-full rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold">✉️ マジックリンクで入る</button>
          <button
            type="button"
            onClick={() => setMode((current) => (current === "login" ? "signup" : "login"))}
            className="mt-6 text-[11px] font-extrabold text-[#C75B38]"
          >
            {mode === "login" ? "はじめての方はこちら" : "アカウントをお持ちの方はこちら"}
          </button>
        </form>
      </section>
    </div>
  );
}

function SetupView({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="w-full max-w-[760px] md:pt-10">
      <Overline>SET UP YOUR HOUSEHOLD</Overline>
      <h1 className="heading md:text-2xl">世帯をセットアップ</h1>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="card">
          <div className="flex gap-3"><Thumb>HomeIcon</Thumb><div><b>新しい世帯をつくる</b><p className="meta">あなたが管理者になります</p></div></div>
          <Field label="世帯名"><input name="household" className="input" placeholder="例：山田家" /></Field>
          <button name="setupAction" value="create" className="btn-primary w-full">つくる <span className="font-[var(--font-outfit)] text-xs opacity-70">CREATE</span></button>
        </div>
        <div className="card">
          <div className="flex gap-3"><Thumb>KeyRound</Thumb><div><b>招待コードで参加</b><p className="meta">家族から共有されたコードを入力</p></div></div>
          <Field label="招待コード"><input name="inviteCode" className="input font-[var(--font-outfit)] tracking-[.16em]" placeholder="ABCD-1234" /></Field>
          <button name="setupAction" value="join" className="min-h-12 w-full rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold">参加する <span className="font-[var(--font-outfit)] text-xs opacity-60">JOIN</span></button>
        </div>
      </div>
    </form>
  );
}

function StockView(props: {
  household: string;
  items: StockItem[];
  totalCount: number;
  needCount: number;
  batchNotifyCount: number;
  categoryCounts: Record<Category, number>;
  categoryIcons: CategoryIcons;
  filter: Filter;
  setFilter: (filter: Filter) => void;
  onAdd: () => void;
  onDetail: (id: string) => void;
  onStatus: (id: string, status: ItemStatus) => void;
  onBatchNotify: () => void;
  onLoadSample: () => void;
}) {
  return (
    <div className="pb-20 md:pb-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start">
        <div>
          <Overline>{props.household || "YAMADA FAMILY"}</Overline>
          <h1 className="heading mb-0">在庫一覧</h1>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-6 md:ml-auto md:justify-end">
          <FilterChip active={props.filter === "all"} onClick={() => props.setFilter("all")}>すべて ({props.totalCount})</FilterChip>
          <FilterChip active={props.filter === "needs"} onClick={() => props.setFilter("needs")}>要購入 ({props.needCount})</FilterChip>
          {categories.map((category) => (
            <FilterChip key={category} active={props.filter === category} onClick={() => props.setFilter(category)}>
              <AppIcon name={getCategoryIcon(category, props.categoryIcons)} className="size-3.5" />
              {category} ({props.categoryCounts[category]})
            </FilterChip>
          ))}
        </div>
        <div className="grid gap-3 md:w-auto">
          <button
            type="button"
            onClick={props.onBatchNotify}
            disabled={!props.batchNotifyCount}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold disabled:border-[#D8CCB7] disabled:bg-[#F5EFE2] disabled:text-[#9A9183] md:w-auto"
          >
            <ShoppingCart className="size-4" strokeWidth={2.5} aria-hidden="true" />
            購入品をまとめて通知 ({props.batchNotifyCount})
          </button>
          <button onClick={props.onAdd} className="btn-primary mt-1 w-full shrink-0 px-5 py-2.5 md:mt-0 md:w-auto">➕ 追加</button>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {props.items.map((item) => (
          <ItemCard key={item.id} item={item} onDetail={props.onDetail} onStatus={props.onStatus} />
        ))}
      </div>
      {!props.items.length ? (
        <div className="card mx-auto mt-8 max-w-xl text-center">
          <div className="mx-auto mb-3 grid size-16 place-items-center rounded-2xl border-2 border-[#2B2A27] bg-[#FFF7EC] text-[#33312E]">
            <PackageOpen className="size-8" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-black">まだアイテムがありません</h2>
          <p className="meta mt-2 leading-6">初回利用時は空の在庫一覧から始まります。管理したい日用品や調味料を追加してください。</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button onClick={props.onAdd} className="btn-primary px-5 py-2.5">➕ アイテムを追加</button>
            <button onClick={props.onLoadSample} className="min-h-12 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold">サンプルでデザイン確認</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ItemCard({ item, onDetail, onStatus }: { item: StockItem; onDetail: (id: string) => void; onStatus: (id: string, status: ItemStatus) => void }) {
  return (
    <article className={`card ${item.status === "discontinued" ? "opacity-60" : ""}`}>
      <button onClick={() => onDetail(item.id)} className="flex w-full gap-3 text-left">
        <Thumb>{item.icon}</Thumb>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-[15px] font-extrabold leading-snug">{item.name}</h2>
          <div className="meta mt-1 space-y-1">
            <p><span className="tag">{item.category}</span> {item.lastPurchaseMemo || item.note || "購入メモ未登録"}</p>
            <p>
              <span className="tag">更新</span>{" "}
              <span className="inline-flex items-center gap-1 align-middle">
              <Avatar name={item.updatedBy} avatarUrl={item.updatedByAvatarUrl} size="xs" />
              {item.updatedBy}
              </span>
            </p>
          </div>
        </div>
      </button>
      <div className="mt-3 grid grid-cols-3 gap-[7px]">
        {(["in_stock", "low", "out"] as ItemStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => onStatus(item.id, status)}
            className={`rounded-[10px] border-2 px-1 py-2 text-[11px] font-extrabold ${item.status === status ? statusConfig[status].button : "border-[#E7DCC6] bg-white text-[#7A746B]"}`}
          >
            {statusConfig[status].short}
          </button>
        ))}
      </div>
    </article>
  );
}

function AddItemView({
  form,
  setForm,
  categoryIcons,
  onSubmit,
  onCancel,
}: {
  form: { name: string; category: Category; note: string };
  setForm: (form: { name: string; category: Category; note: string }) => void;
  categoryIcons: CategoryIcons;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="w-full max-w-[620px]">
      <Overline>NEW ITEM</Overline>
      <h1 className="heading">アイテムを登録</h1>
      <Field label="アイテム名（自由入力 / 銘柄でも用途でもOK）">
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例：キッコーマン 特選丸大豆しょうゆ" />
      </Field>
      <Field label="カテゴリ">
        <div className="flex flex-wrap gap-x-3 gap-y-6">
          {categories.map((category) => (
            <CategoryButton key={category} active={form.category === category} onClick={() => setForm({ ...form, category })}>
              <AppIcon name={getCategoryIcon(category, categoryIcons)} className="size-4" />
              {category}
            </CategoryButton>
          ))}
        </div>
      </Field>
      <Field label="メモ（任意）"><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="いつも詰め替え用を購入" /></Field>
      <p className="note">登録時のステータスは自動で「在庫あり」になります。</p>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={onCancel} className="min-h-12 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold">キャンセル</button>
        <button className="btn-primary flex-1">登録する <span className="font-[var(--font-outfit)] text-xs opacity-70">SAVE</span></button>
      </div>
    </form>
  );
}

function DetailView({
  item,
  onBack,
  onEdit,
  onDelete,
  onStatus,
  onRestock,
}: {
  item: StockItem;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (id: string, status: ItemStatus) => void;
  onRestock: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl pb-20 md:pb-6">
      <button onClick={onBack} className="mb-4 min-h-10 rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-sm font-extrabold"><ArrowLeft className="mr-2 inline size-4" strokeWidth={2.5} aria-hidden="true" />戻る</button>
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <section className="card text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-2xl border-2 border-[#2B2A27] bg-[#FFF7EC] text-[#33312E]">
            <AppIcon name={item.icon} className="size-10" />
          </div>
          <h1 className="mt-2 text-xl font-black">{item.name}</h1>
          <p className="meta mt-1"><span className="tag">{item.category}</span> {item.note}</p>
          <div className="my-3"><StatusPill status={item.status} /></div>
          <div className="grid grid-cols-4 gap-1.5">
            {(["in_stock", "low", "out", "discontinued"] as ItemStatus[]).map((status) => (
              <button key={status} onClick={() => onStatus(item.id, status)} className={`rounded-[10px] border-2 py-2 text-[11px] font-extrabold ${item.status === status ? statusConfig[status].button : "border-[#E7DCC6] bg-white text-[#7A746B]"}`}>{statusConfig[status].short}</button>
            ))}
          </div>
          <button onClick={onRestock} className="btn-primary mb-5 mt-6 inline-flex w-full items-center justify-center gap-2">
            <ShoppingCart className="size-4" strokeWidth={2.5} aria-hidden="true" />
            補充した
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={onEdit} className="min-h-10 rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-sm font-extrabold">編集</button>
            <button onClick={onDelete} className="min-h-10 rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-sm font-extrabold text-[#E4564A]">削除</button>
          </div>
        </section>
        <section>
          <Overline>MEMO</Overline>
          <h2 className="heading">メモ</h2>
          <div className="card mb-3">
            <div className="flex items-center justify-between gap-3">
              <b>登録メモ</b>
              <span className="tag">ITEM</span>
            </div>
            <p className="meta mt-2 leading-6">{item.note || "登録メモはまだありません。"}</p>
          </div>
          <Overline>PURCHASE LOG</Overline>
          <h2 className="heading">補充メモ履歴</h2>
          {item.purchaseLogs.length ? item.purchaseLogs.map((log) => (
            <div key={log.id} className="card mb-3">
              <div className="flex justify-between gap-3"><b>{[log.volume, log.memo].filter(Boolean).join(" / ")}</b><span className="meta font-[var(--font-outfit)]">{log.purchasedAt}</span></div>
              <p className="meta">記録：{log.purchasedBy}</p>
            </div>
          )) : <p className="note">補充時のメモはまだありません。「補充した」から容量や今回買ったものを記録できます。</p>}
        </section>
      </div>
    </div>
  );
}

function EditItemView({
  form,
  setForm,
  categoryIcons,
  onSubmit,
  onCancel,
  onDelete,
}: {
  form: { name: string; category: Category; note: string };
  setForm: (form: { name: string; category: Category; note: string }) => void;
  categoryIcons: CategoryIcons;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl rounded-[22px] border-2 border-[#2B2A27] bg-white p-5 shadow-[0_10px_30px_rgba(80,60,30,.10)]">
      <Overline>EDIT ITEM</Overline>
      <h1 className="heading">アイテムを編集</h1>
      <Field label="アイテム名">
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="カテゴリ">
        <div className="flex flex-wrap gap-x-3 gap-y-6">
          {categories.map((category) => (
            <CategoryButton key={category} active={form.category === category} onClick={() => setForm({ ...form, category })}>
              <AppIcon name={getCategoryIcon(category, categoryIcons)} className="size-4" />
              {category}
            </CategoryButton>
          ))}
        </div>
      </Field>
      <Field label="メモ">
        <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={onCancel} className="min-h-12 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold">キャンセル</button>
        <button className="btn-primary flex-1">保存する <span className="font-[var(--font-outfit)] text-xs opacity-70">SAVE</span></button>
        <button type="button" onClick={onDelete} className="rounded-full px-5 py-3 text-sm font-extrabold text-[#E4564A]">削除する</button>
      </div>
    </form>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HistoryView({ logs }: { logs: ActivityLog[] }) {
  return (
    <section className="w-full max-w-3xl pb-20 md:pb-6">
      <Overline>ACTIVITY</Overline>
      <h1 className="heading">変更履歴</h1>
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="card flex items-center gap-3">
            <Avatar name={log.changedBy} avatarUrl={log.changedByAvatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm"><b>{log.itemName}</b> を <StatusPill status={log.to} small /> に変更</p>
              <p className="meta">{log.changedBy} ・ {log.changedAt} ・ {log.message}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HistoryHubView({
  logs,
  shoppingNotifications,
  onResolveShoppingNotification,
}: {
  logs: ActivityLog[];
  shoppingNotifications: ShoppingNotification[];
  onResolveShoppingNotification: (notificationId: string, updates: ShoppingNotificationResolveItem[]) => void | Promise<void>;
}) {
  const [view, setView] = useState<"menu" | "changes" | "shopping">("menu");
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const selectedNotification = shoppingNotifications.find((notification) => notification.id === selectedNotificationId) ?? null;
  const unresolvedCount = shoppingNotifications.filter((notification) => !notification.resolvedAt).length;

  if (selectedNotification) {
    return (
      <ShoppingNotificationDetail
        notification={selectedNotification}
        onBack={() => setSelectedNotificationId(null)}
        onResolve={async (updates) => {
          await onResolveShoppingNotification(selectedNotification.id, updates);
          setSelectedNotificationId(null);
        }}
      />
    );
  }

  if (view === "changes") {
    return (
      <section className="w-full max-w-3xl pb-20 md:pb-6">
        <button type="button" onClick={() => setView("menu")} className="mb-4 min-h-11 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-2 text-sm font-extrabold">
          <ArrowLeft className="mr-2 inline size-4" strokeWidth={2.5} aria-hidden="true" />履歴に戻る
        </button>
        <Overline>ACTIVITY</Overline>
        <h1 className="heading">変更履歴</h1>
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="card flex items-center gap-3">
              <Avatar name={log.changedBy} avatarUrl={log.changedByAvatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm"><b>{log.itemName}</b> を <StatusPill status={log.to} small /> に変更</p>
                <p className="meta">{log.changedBy} ・ {log.changedAt} ・ {log.message}</p>
              </div>
            </div>
          ))}
          {!logs.length ? <p className="note">変更履歴はまだありません。</p> : null}
        </div>
      </section>
    );
  }

  if (view === "shopping") {
    return (
      <section className="w-full max-w-3xl pb-20 md:pb-6">
        <button type="button" onClick={() => setView("menu")} className="mb-4 min-h-11 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-2 text-sm font-extrabold">
          <ArrowLeft className="mr-2 inline size-4" strokeWidth={2.5} aria-hidden="true" />履歴に戻る
        </button>
        <Overline>SHOPPING NOTICE</Overline>
        <h1 className="heading">通知履歴</h1>
        <div className="space-y-4">
          {shoppingNotifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => setSelectedNotificationId(notification.id)}
              className="card block w-full text-left active:translate-y-[1px] active:bg-[#FFF7EC]"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full border-2 px-3 py-1 text-xs font-extrabold ${notification.resolvedAt ? "border-[#BFD8B4] bg-[#F1FAEC] text-[#4C7A44]" : "border-[#E0734D] bg-[#FFF1E8] text-[#C45B37]"}`}>
                  {notification.resolvedAt ? "解決済み" : "未解決"}
                </span>
                <span className="meta">{notification.createdAt}</span>
              </div>
              <p className="text-sm font-extrabold leading-6">購入品 {notification.items.length}件</p>
              <p className="meta mt-1">LINE送信: {notification.lineStatus || "未記録"}{notification.resolvedAt ? ` ・ 解決: ${notification.resolvedAt}` : ""}</p>
            </button>
          ))}
          {!shoppingNotifications.length ? <p className="note">通知履歴はまだありません。</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-2xl pb-20 md:pb-6">
      <Overline>HISTORY</Overline>
      <h1 className="heading">履歴</h1>
      <div className="grid gap-4">
        <SettingsMenuButton icon="History" title="変更履歴" meta={`${logs.length}件`} onClick={() => setView("changes")} />
        <SettingsMenuButton icon="ShoppingCart" title="通知履歴" meta={`未解決 ${unresolvedCount}件 / 全${shoppingNotifications.length}件`} onClick={() => setView("shopping")} />
      </div>
    </section>
  );
}

function ShoppingNotificationDetail({
  notification,
  onBack,
  onResolve,
}: {
  notification: ShoppingNotification;
  onBack: () => void;
  onResolve: (updates: ShoppingNotificationResolveItem[]) => void | Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, ShoppingNotificationResolveItem>>(() =>
    notification.items.reduce<Record<string, ShoppingNotificationResolveItem>>((acc, item) => {
      acc[item.id] = {
        id: item.id,
        itemId: item.itemId,
        restocked: item.restocked,
        volume: item.volume,
        memo: item.memo,
      };
      return acc;
    }, {}),
  );
  const [saving, setSaving] = useState(false);
  const updateDraft = (id: string, patch: Partial<ShoppingNotificationResolveItem>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };
  const checkedCount = Object.values(drafts).filter((draft) => draft.restocked).length;

  return (
    <section className="w-full max-w-3xl pb-20 md:pb-6">
      <button type="button" onClick={onBack} className="mb-4 min-h-11 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-2 text-sm font-extrabold">
        <ArrowLeft className="mr-2 inline size-4" strokeWidth={2.5} aria-hidden="true" />通知履歴に戻る
      </button>
      <Overline>SHOPPING NOTICE</Overline>
      <h1 className="heading">購入通知の詳細</h1>
      <div className="card mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`rounded-full border-2 px-3 py-1 text-xs font-extrabold ${notification.resolvedAt ? "border-[#BFD8B4] bg-[#F1FAEC] text-[#4C7A44]" : "border-[#E0734D] bg-[#FFF1E8] text-[#C45B37]"}`}>
            {notification.resolvedAt ? "解決済み" : "未解決"}
          </span>
          <span className="meta">{notification.createdAt}</span>
        </div>
        <p className="meta mt-2">買えたものだけチェックすると、そのアイテムだけ在庫ありに戻ります。</p>
      </div>
      <div className="space-y-4">
        {notification.items.map((item) => {
          const draft = drafts[item.id];
          return (
            <div key={item.id} className="card">
              <label className="flex min-h-12 items-center gap-3 text-sm font-extrabold">
                <input
                  type="checkbox"
                  checked={draft.restocked}
                  onChange={(event) => updateDraft(item.id, { restocked: event.target.checked })}
                  className="size-5 accent-[#E0734D]"
                  disabled={Boolean(notification.resolvedAt)}
                />
                <span className="min-w-0 flex-1">{item.itemName}</span>
                <StatusPill status={item.status} small />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  className="input"
                  value={draft.volume}
                  onChange={(event) => updateDraft(item.id, { volume: event.target.value })}
                  placeholder="個数・容量"
                  disabled={Boolean(notification.resolvedAt)}
                />
                <input
                  className="input"
                  value={draft.memo}
                  onChange={(event) => updateDraft(item.id, { memo: event.target.value })}
                  placeholder="購入メモ"
                  disabled={Boolean(notification.resolvedAt)}
                />
              </div>
            </div>
          );
        })}
      </div>
      {!notification.resolvedAt ? (
        <button
          type="button"
          onClick={async () => {
            setSaving(true);
            await onResolve(Object.values(drafts));
            setSaving(false);
          }}
          disabled={saving}
          className="btn-primary mt-6 w-full"
        >
          解決済みにする <span className="font-[var(--font-outfit)] text-xs opacity-70">{checkedCount} ITEMS</span>
        </button>
      ) : null}
    </section>
  );
}

function MissingItemView({ onBack }: { onBack: () => void }) {
  return (
    <section className="card mx-auto w-full max-w-lg text-center">
      <div className="mx-auto mb-3 grid size-16 place-items-center rounded-2xl border-2 border-[#2B2A27] bg-[#FFF7EC] text-[#33312E]">
        <Search className="size-8" strokeWidth={2.5} aria-hidden="true" />
      </div>
      <Overline>NOT FOUND</Overline>
      <h1 className="heading">アイテムが見つかりません</h1>
      <p className="meta leading-6">削除済み、または現在の世帯に存在しないアイテムです。在庫一覧から対象を選び直してください。</p>
      <button onClick={onBack} className="btn-primary mt-4 px-5 py-2.5">在庫一覧へ戻る</button>
    </section>
  );
}

function SettingsView({
  household,
  inviteCode,
  members,
  displayNameDraft,
  setDisplayNameDraft,
  profileAvatarDraft,
  setProfileAvatarDraft,
  categoryIcons,
  lineConnected,
  lineTargetType,
  lineFriendUrl,
  setLineConnected,
  onSaveDisplayName,
  onSaveCategoryIcons,
  onLogout,
}: {
  household: string;
  inviteCode: string;
  members: HouseholdMember[];
  displayNameDraft: string;
  setDisplayNameDraft: (displayName: string) => void;
  profileAvatarDraft: string;
  setProfileAvatarDraft: (avatarUrl: string) => void;
  categoryIcons: CategoryIcons;
  lineConnected: boolean;
  lineTargetType: "user" | "group" | null;
  lineFriendUrl: string;
  setLineConnected: (connected: boolean) => void | Promise<void>;
  onSaveDisplayName: (displayName: string, avatarUrl?: string) => void | Promise<void>;
  onSaveCategoryIcons: (icons: CategoryIcons) => void | Promise<void>;
  onLogout: () => void | Promise<void>;
}) {
  const lineTargetLabel = lineTargetType === "user" ? "自分のLINE" : `${household} グループ`;
  const [categoryIconDraft, setCategoryIconDraft] = useState<CategoryIcons>(() => normalizeCategoryIcons(categoryIcons));
  const [settingsSection, setSettingsSection] = useState<"menu" | "line" | "icons" | "members">("menu");

  function updateAvatar(file: File | null) {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const image = document.createElement("img");
    image.onload = () => {
      const maxSize = 320;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
      setProfileAvatarDraft(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;
  }

  const backToSettingsMenu = (
    <div className="mb-4 block">
      <button
        type="button"
        onClick={() => setSettingsSection("menu")}
        className="min-h-10 rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-sm font-extrabold"
      >
        <ArrowLeft className="mr-2 inline size-4" strokeWidth={2.5} aria-hidden="true" />設定へ戻る
      </button>
    </div>
  );

  if (settingsSection === "menu") {
    return (
      <section className="w-full max-w-3xl pb-20 md:pb-6">
        <Overline>SETTINGS</Overline>
        <h1 className="heading">設定</h1>
        <div className="space-y-3">
          <SettingsMenuButton
            icon="MessageCircle"
            title="LINE通知"
            meta={lineConnected ? <><Check className="mr-1 inline size-3.5" strokeWidth={3} aria-hidden="true" />連携済み</> : "未連携"}
            onClick={() => setSettingsSection("line")}
          />
          <SettingsMenuButton
            icon="Apple"
            title="カテゴリ別アイコン"
            meta="カテゴリごとの表示アイコンを設定"
            onClick={() => setSettingsSection("icons")}
          />
          <SettingsMenuButton
            icon="Boxes"
            title="家族メンバー"
            meta={members.length ? `${members.length}名` : "メンバー未取得"}
            onClick={() => setSettingsSection("members")}
          />
        </div>
        <button onClick={onLogout} className="mt-5 rounded-full px-5 py-3 text-sm font-extrabold text-[#E4564A]">ログアウト</button>
      </section>
    );
  }

  if (settingsSection === "line") {
    return (
      <section className="w-full max-w-3xl pb-20 md:pb-6">
        {backToSettingsMenu}
        <Overline>SETTINGS</Overline>
        <h1 className="heading">LINE通知</h1>
        <div className="card">
          <div className="flex gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl border-2 border-[#05a648] bg-[#E7FBEE] text-[#05a648]"><MessageCircle className="size-6" strokeWidth={2.5} aria-hidden="true" /></span><div><b>LINE通知</b><p className={`meta font-bold ${lineConnected ? "text-[#4F9D69]" : "text-[#E4564A]"}`}>{lineConnected ? <><Check className="mr-1 inline size-3.5" strokeWidth={3} aria-hidden="true" />連携済み</> : "未連携"}</p></div></div>
          <p className="meta mt-4">通知先：{lineConnected ? lineTargetLabel : "未設定"}</p>
          <button
            onClick={() => {
              if (lineConnected) {
                setLineConnected(false);
                return;
              }
              if (lineFriendUrl) {
                window.open(lineFriendUrl, "_blank", "noreferrer");
                return;
              }
              setLineConnected(true);
            }}
            className="mt-4 min-h-12 w-full rounded-full border-2 border-[#05a648] bg-[#06C755] px-5 py-3 text-sm font-extrabold text-white shadow-[0_4px_0_#05a648]"
          >
            {lineConnected ? <><Check className="mr-1 inline size-3.5" strokeWidth={3} aria-hidden="true" />連携済み</> : "友だち追加 / 連携する"}
          </button>
          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            {lineFriendUrl ? (
              <a
                href={lineFriendUrl}
                target="_blank"
                rel="noreferrer"
                className="grid min-h-11 place-items-center rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-center text-sm font-extrabold"
              >
                公式LINEを開く
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="min-h-11 rounded-full border-2 border-[#D8CCB7] bg-[#F5EFE2] px-4 py-2 text-sm font-extrabold text-[#9A9183]"
              >
                公式LINEを開く
              </button>
            )}
            <button
              type="button"
              onClick={() => lineFriendUrl && navigator.clipboard?.writeText(lineFriendUrl)}
              disabled={!lineFriendUrl}
              className="min-h-11 rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-sm font-extrabold disabled:border-[#D8CCB7] disabled:bg-[#F5EFE2] disabled:text-[#9A9183]"
            >
              公式LINE URLをコピー
            </button>
          </div>
          {!lineFriendUrl ? <p className="meta mt-3">VercelにNEXT_PUBLIC_LINE_FRIEND_URLを設定すると、公式LINEへの導線が有効になります。</p> : null}
          <div className="mt-4 rounded-[14px] border border-dashed border-[#B9AD98] bg-[#FFF9EC] p-3 text-xs font-bold leading-6 text-[#6F675D]">
            <p>LINE連携コードは、通知先を登録するためのコードです。</p>
            <p>自分だけに通知する場合は、公式LINEとのトークに送ってください。</p>
            <p>家族グループに通知する場合は、公式LINEを入れたグループに送ってください。</p>
            <p>送信後、そのトークまたはグループが通知先として保存されます。</p>
          </div>
          {/* <p className="note">残りわずか・在庫切れのみ通知。自分のLINEまたは1グループに集約し無料枠（月約200通）を節約。</p> */}
        </div>
      </section>
    );
  }

  if (settingsSection === "icons") {
    return (
      <section className="w-full max-w-3xl pb-20 md:pb-6">
        {backToSettingsMenu}
        <Overline>SETTINGS</Overline>
        <h1 className="heading">カテゴリ別アイコン</h1>
        <div className="card">
          <div className="flex gap-3">
            <Thumb>Apple</Thumb>
            <div>
              <b>カテゴリ別アイコン</b>
              <p className="meta">アイテムのアイコンはカテゴリごとに設定したものを表示します。</p>
            </div>
          </div>
          <div className="mt-4 space-y-10">
            {categories.map((category) => (
              <div key={category}>
                <div className="mb-4 flex items-center gap-2 text-sm font-extrabold">
                  <span className="grid size-12 place-items-center rounded-xl border-2 border-[#2B2A27] bg-[#FFF7EC] text-[#33312E]"><AppIcon name={categoryIconDraft[category]} className="size-6" /></span>
                  {category}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-7">
                  {getCategoryIconChoices(category).map((icon) => (
                    <button
                      type="button"
                      key={`${category}-${icon}`}
                      onClick={() => setCategoryIconDraft({ ...categoryIconDraft, [category]: icon })}
                      aria-label={`${category} のアイコンを ${icon} にする`}
                      aria-pressed={categoryIconDraft[category] === icon}
                      className={`grid size-16 place-items-center rounded-xl border-2 text-[34px] leading-none ${
                        categoryIconDraft[category] === icon
                          ? "border-[#2B2A27] bg-[#FFF1E6] shadow-[0_3px_0_#2B2A27]"
                          : "border-[#E7DCC6] bg-white"
                      }`}
                    >
                      <AppIcon name={icon} className="size-8" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onSaveCategoryIcons(categoryIconDraft)}
            className="btn-primary mt-10 w-full"
          >
            カテゴリアイコンを保存
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-4xl pb-20 md:pb-6">
      {backToSettingsMenu}
      <Overline>SETTINGS</Overline>
      <h1 className="heading">家族メンバー</h1>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="hidden">
          <div className="flex gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl border-2 border-[#05a648] bg-[#E7FBEE] text-[#05a648]"><MessageCircle className="size-6" strokeWidth={2.5} aria-hidden="true" /></span><div><b>LINE通知</b><p className={`meta font-bold ${lineConnected ? "text-[#4F9D69]" : "text-[#E4564A]"}`}>{lineConnected ? <><Check className="mr-1 inline size-3.5" strokeWidth={3} aria-hidden="true" />連携済み</> : "未連携"}</p></div></div>
          <p className="meta mt-4">通知先：{lineConnected ? lineTargetLabel : "未設定"}</p>
          <button
            onClick={() => {
              if (lineConnected) {
                setLineConnected(false);
                return;
              }
              if (lineFriendUrl) {
                window.open(lineFriendUrl, "_blank", "noreferrer");
                return;
              }
              setLineConnected(true);
            }}
            className="mt-4 min-h-12 w-full rounded-full border-2 border-[#05a648] bg-[#06C755] px-5 py-3 text-sm font-extrabold text-white shadow-[0_4px_0_#05a648]"
          >
            {lineConnected ? <><Check className="mr-1 inline size-3.5" strokeWidth={3} aria-hidden="true" />連携済み</> : "友だち追加 / 連携する"}
          </button>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {lineFriendUrl ? (
              <a
                href={lineFriendUrl}
                target="_blank"
                rel="noreferrer"
                className="grid min-h-11 place-items-center rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-center text-sm font-extrabold"
              >
                公式LINEを開く
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="min-h-11 rounded-full border-2 border-[#D8CCB7] bg-[#F5EFE2] px-4 py-2 text-sm font-extrabold text-[#9A9183]"
              >
                公式LINE URL未設定
              </button>
            )}
            <button
              type="button"
              onClick={() => lineFriendUrl && navigator.clipboard?.writeText(lineFriendUrl)}
              disabled={!lineFriendUrl}
              className="min-h-11 rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-sm font-extrabold disabled:border-[#D8CCB7] disabled:bg-[#F5EFE2] disabled:text-[#9A9183]"
            >
              公式LINE URLをコピー
            </button>
          </div>
          {!lineFriendUrl ? <p className="meta mt-3">VercelにNEXT_PUBLIC_LINE_FRIEND_URLを設定すると、公式LINEへの導線が有効になります。</p> : null}
          <div className="mt-4 rounded-[14px] border border-dashed border-[#B9AD98] bg-[#FFF9EC] p-3 text-xs font-bold leading-6 text-[#6F675D]">
            <p>LINE連携コードは、通知先を登録するためのコードです。</p>
            <p>自分だけに通知する場合は、公式LINEとのトークに送ってください。</p>
            <p>家族グループに通知する場合は、公式LINEを入れたグループに送ってください。</p>
            <p>送信後、そのトークまたはグループが通知先として保存されます。</p>
          </div>
          <p className="note">残りわずか・在庫切れのみ通知。自分のLINEまたは1グループに集約し無料枠（月約200通）を節約。</p>
        </div>
        <div className="hidden">
          <div className="flex gap-3">
            <Thumb>{categoryIconDraft.その他}</Thumb>
            <div>
              <b>カテゴリ別アイコン</b>
              <p className="meta">アイテムのアイコンはカテゴリごとに設定したものを表示します。</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {categories.map((category) => (
              <div key={category}>
                <div className="mb-2 flex items-center gap-2 text-sm font-extrabold">
                  <span className="grid size-9 place-items-center rounded-xl border-2 border-[#2B2A27] bg-[#FFF7EC] text-[#33312E]"><AppIcon name={categoryIconDraft[category]} className="size-5" /></span>
                  {category}
                </div>
                <div className="flex flex-wrap gap-2">
                  {getCategoryIconChoices(category).map((icon) => (
                    <button
                      type="button"
                      key={`${category}-${icon}`}
                      onClick={() => setCategoryIconDraft({ ...categoryIconDraft, [category]: icon })}
                      aria-label={`${category} のアイコンを ${icon} にする`}
                      aria-pressed={categoryIconDraft[category] === icon}
                      className={`grid size-11 place-items-center rounded-xl border-2 text-xl ${
                        categoryIconDraft[category] === icon
                          ? "border-[#2B2A27] bg-[#FFF1E6] shadow-[0_3px_0_#2B2A27]"
                          : "border-[#E7DCC6] bg-white"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onSaveCategoryIcons(categoryIconDraft)}
            className="btn-primary mt-5 w-full"
          >
            カテゴリアイコンを保存
          </button>
        </div>
        <div className="card">
          <div className="flex gap-3"><Thumb>UsersRound</Thumb><div><b>家族メンバー</b><p className="meta">{members.length ? `${members.map((member) => member.displayName).join("・")} の${members.length}名` : "メンバー未取得"}</p></div></div>
          <div className="mt-[14px]">
            <label className="block text-left text-[12.5px] font-extrabold leading-relaxed">あなたの表示名</label>
            <div className="mt-[6px] flex items-center gap-3">
              <Avatar name={displayNameDraft || "あなた"} avatarUrl={profileAvatarDraft} size="lg" />
              <div className="min-w-0 flex-1">
                <input className="input" value={displayNameDraft} onChange={(event) => setDisplayNameDraft(event.target.value)} placeholder="例：ママ / パパ" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="grid min-h-10 cursor-pointer place-items-center rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-xs font-extrabold">
                    画像を設定
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => updateAvatar(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  {profileAvatarDraft ? (
                    <button
                      type="button"
                      onClick={() => setProfileAvatarDraft("")}
                      className="min-h-10 rounded-full px-4 py-2 text-xs font-extrabold text-[#E4564A]"
                    >
                      画像を削除
                    </button>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSaveDisplayName(displayNameDraft, profileAvatarDraft)}
                className="min-h-12 shrink-0 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold"
              >
                保存
              </button>
            </div>
          </div>
          <div className="mt-[14px]">
            <label className="block text-left text-[12.5px] font-extrabold leading-relaxed">LINE連携コード</label>
            <p className="meta mt-1">このコードを通知したいLINEトークまたはグループに送ると、そこが通知先になります。</p>
            <input className="input mt-[6px] text-left font-[var(--font-outfit)] font-semibold tracking-[.2em]" readOnly value={inviteCode || "未発行"} />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(inviteCode)}
              disabled={!inviteCode}
              className="mt-4 min-h-12 w-full rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold"
            ><Copy className="mr-2 inline size-4" strokeWidth={2.5} aria-hidden="true" />LINE連携コードをコピー
            </button>
          </div>
          <div className="mt-5 border-t border-[#E7DCC6] pt-4">
            <p className="mb-2 text-xs font-extrabold">メンバー</p>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-2 text-xs">
                  <Avatar name={member.displayName || "家族"} avatarUrl={member.avatarUrl} size="sm" />
                  <span>
                    <b>{member.displayName}</b>
                    {member.email ? <span className="meta ml-2">{member.email}</span> : null}
                  </span>
                </div>
              ))}
              {!members.length ? <p className="meta">メンバー情報を読み込み中です</p> : null}
            </div>
          </div>
        </div>
      </div>
      <button onClick={onLogout} className="mt-5 rounded-full px-5 py-3 text-sm font-extrabold text-[#E4564A]">ログアウト</button>
    </section>
  );
}

function StatusConfirmModal({
  item,
  to,
  onConfirm,
  onConfirmWithLine,
  onClose,
}: {
  item: StockItem;
  to: ItemStatus;
  onConfirm: () => void;
  onConfirmWithLine: () => void;
  onClose: () => void;
}) {
  const willNotify = to === "out";

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#2B2A27]/40 px-4">
      <div className="w-full max-w-sm rounded-[22px] border-2 border-[#2B2A27] bg-white p-5 shadow-[0_10px_30px_rgba(80,60,30,.20)]">
        <Overline>STATUS</Overline>
        <h2 className="heading">ステータスを変更しますか？</h2>
        <p className="text-sm leading-7">
          <b>{item.name}</b> を <StatusPill status={to} small /> に変更します。
          {to === "low" ? " 確定後、お知らせに追加されます。" : ""}
          {willNotify ? " LINE連携中の場合は、確定後にLINE通知とお知らせが送信されます。" : ""}
        </p>
        {to === "out" ? (
          <div className="mt-5 grid gap-3">
            <button type="button" onClick={onConfirmWithLine} className="btn-primary w-full">今すぐLINE通知して変更</button>
            <button type="button" onClick={onConfirm} className="min-h-12 w-full rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold">後でまとめて通知する</button>
            <button type="button" onClick={onClose} className="min-h-12 w-full rounded-full px-5 py-3 text-sm font-extrabold text-[#7A746B]">キャンセル</button>
          </div>
        ) : (
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold">キャンセル</button>
            <button type="button" onClick={onConfirm} className="btn-primary flex-1">変更する</button>
          </div>
        )}
      </div>
    </div>
  );
}

function BatchNotifyConfirmModal({ count, onConfirm, onClose }: { count: number; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#2B2A27]/40 px-4">
      <div className="w-full max-w-sm rounded-[22px] border-2 border-[#2B2A27] bg-white p-5 shadow-[0_10px_30px_rgba(80,60,30,.20)]">
        <Overline>LINE</Overline>
        <h2 className="heading">まとめて通知しますか？</h2>
        <p className="text-sm leading-7">要購入のアイテム {count} 件を、1通のLINEメッセージにまとめて通知します。通知履歴にも保存されます。</p>
        <div className="mt-5 grid gap-3">
          <button type="button" onClick={onConfirm} disabled={!count} className="btn-primary w-full disabled:opacity-50">LINE通知する</button>
          <button type="button" onClick={onClose} className="min-h-12 w-full rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold">キャンセル</button>
        </div>
      </div>
    </div>
  );
}

function NotificationPanel({
  notifications,
  readNotificationIds,
  onRead,
  onClose,
}: {
  notifications: AppNotification[];
  readNotificationIds: string[];
  onRead: (notificationId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-[#2B2A27]/35 px-4 py-5">
      <section className="ml-auto flex h-full w-full max-w-md flex-col rounded-[22px] border-2 border-[#2B2A27] bg-white p-5 shadow-[0_10px_30px_rgba(80,60,30,.20)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl border-2 border-[#2B2A27] bg-[#FFF7EC] text-[#33312E]"><Bell className="size-5" strokeWidth={2.5} aria-hidden="true" /></div>
          <div className="min-w-0 flex-1">
            <Overline>NOTICE</Overline>
            <h2 className="text-lg font-black">お知らせ</h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-10 rounded-full border-2 border-[#2B2A27] bg-white px-4 py-2 text-sm font-extrabold">閉じる</button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {notifications.length ? (
            notifications.map((notification) => {
              const isRead = readNotificationIds.includes(notification.id);
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onRead(notification.id)}
                  className={`block w-full rounded-[14px] border-2 p-3 text-left transition ${
                    isRead ? "border-[#E7DCC6] bg-white opacity-70" : "border-[#E0734D] bg-[#FFFBF4]"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <StatusPill status={notification.status} small />
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${isRead ? "bg-[#F1EEE7] text-[#7A746B]" : "bg-[#E4564A] text-white"}`}>
                        {isRead ? "既読" : "未読"}
                      </span>
                      <span className="meta font-[var(--font-outfit)]">{notification.changedAt}</span>
                    </div>
                  </div>
                  <p className="text-sm font-extrabold leading-6">{notification.itemName}</p>
                  <p className="meta mt-1">{notification.message} ・ {notification.changedBy}</p>
                </button>
              );
            })
          ) : (
            <p className="note">お知らせはまだありません。ステータスが「わずか」または「切れ」になるとここに表示されます。</p>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsMenuButton({
  icon,
  title,
  meta,
  onClick,
}: {
  icon: string;
  title: string;
  meta: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 w-full items-center gap-3 rounded-[16px] border-2 border-[#2B2A27] bg-white p-4 text-left shadow-[0_4px_14px_rgba(80,60,30,0.08)]"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl border-2 border-[#2B2A27] bg-[#FFF7EC] text-[#33312E]">
        <AppIcon name={icon} className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black">{title}</span>
        <span className="meta mt-1 block">{meta}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-[#7A746B]" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}

function DeleteConfirmModal({ item, onDelete, onClose }: { item: StockItem; onDelete: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#2B2A27]/40 px-4">
      <div className="w-full max-w-sm rounded-[22px] border-2 border-[#2B2A27] bg-white p-5 shadow-[0_10px_30px_rgba(80,60,30,.20)]">
        <Overline>DELETE</Overline>
        <h2 className="heading">削除しますか？</h2>
        <p className="text-sm leading-7"><b>{item.name}</b> と購入メモ履歴を一覧から削除します。この操作は取り消せません。</p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold">キャンセル</button>
          <button type="button" onClick={onDelete} className="flex-1 rounded-full border-2 border-[#E4564A] bg-[#E4564A] px-4 py-3 text-sm font-extrabold text-white">削除する</button>
        </div>
      </div>
    </div>
  );
}

function RestockModal({ item, onSubmit, onClose }: { item: StockItem; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#2B2A27]/40 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-[520px] rounded-[22px] border-2 border-[#2B2A27] bg-white p-5 shadow-[0_10px_30px_rgba(80,60,30,.20)]">
        <div className="mb-4 flex items-center gap-3"><div className="grid size-12 place-items-center rounded-xl border-2 border-[#2B2A27] bg-[#FFF7EC] text-[#33312E]"><ShoppingCart className="size-6" strokeWidth={2.5} aria-hidden="true" /></div><div><Overline>RESTOCK</Overline><h2 className="text-lg font-black">補充メモを残す</h2><p className="meta">{item.name} から 在庫あり</p></div></div>
        <div className="md:flex md:gap-4">
          <Field label="容量"><input name="volume" className="input" placeholder="例：1L / 3個 / 12ロール" defaultValue={item.lastPurchaseMemo?.split("/")[0]?.trim()} /></Field>
          <Field label="メモ（今回買ったもの）"><input name="memo" className="input" placeholder="今回は詰め替え用を買った" /></Field>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button name="restockMode" value="none" className="min-h-12 rounded-full border-2 border-[#2B2A27] bg-white px-5 py-3 text-sm font-extrabold sm:flex-1" formNoValidate>メモなしで戻す</button>
          <button name="restockMode" value="save" className="btn-primary sm:flex-1">記録して在庫ありに <span className="font-[var(--font-outfit)] text-xs opacity-70">SAVE</span></button>
        </div>
        <button type="button" onClick={onClose} className="mt-5 min-h-12 w-full rounded-full px-4 py-3 text-sm font-extrabold text-[#7A746B]">キャンセル</button>
      </form>
    </div>
  );
}

function MobileNav({ screen, go }: { screen: Screen; go: (screen: Screen) => void }) {
  const nav = [
    ["stock", "ClipboardList", "在庫"],
    ["add", "Plus", "追加"],
    ["history", "History", "履歴"],
    ["settings", "Settings", "設定"],
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[#E7DCC6] bg-white md:hidden">
      {nav.map(([id, icon, label]) => (
        <button key={id} onClick={() => go(id)} className={`py-2 text-center text-[10px] font-extrabold ${screen === id ? "text-[#E0734D]" : "text-[#7A746B]"}`}><AppIcon name={icon} className="mx-auto mb-1 size-5" />{label}</button>
      ))}
    </nav>
  );
}

function StatusPill({ status, small = false }: { status: ItemStatus; small?: boolean }) {
  return <span className={`inline-flex items-center rounded-full border-2 font-extrabold ${small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"} ${statusConfig[status].chip}`}>{statusConfig[status].label}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mt-[14px] block text-left text-[12.5px] font-extrabold leading-relaxed">{label}<span className="mt-[6px] block">{children}</span></label>;
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[#2B2A27] px-4 py-1.5 text-xs font-extrabold ${active ? "bg-[#33312E] text-white" : "bg-white text-[#33312E]"}`}>{children}</button>;
}

function CategoryButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-12 min-w-[112px] items-center justify-center gap-2 rounded-full border-2 border-[#2B2A27] px-5 py-3 text-sm font-extrabold ${
        active ? "bg-[#33312E] text-white" : "bg-white text-[#33312E]"
      }`}
    >
      {children}
    </button>
  );
}

function Overline({ children }: { children: React.ReactNode }) {
  return <span className="font-[var(--font-outfit)] text-[11px] font-extrabold tracking-[.12em] text-[#E0734D]">{children}</span>;
}

function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl?: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const sizeClass = {
    xs: "size-[18px] text-[9px]",
    sm: "size-[30px] text-xs",
    md: "size-9 text-sm",
    lg: "size-14 text-base",
  }[size];
  const pixelSize = size === "lg" ? 56 : size === "md" ? 36 : size === "sm" ? 30 : 18;

  return (
    <span className={`relative grid shrink-0 overflow-hidden rounded-full bg-[#6E8B4E] ${sizeClass} place-items-center font-extrabold text-white`}>
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" width={pixelSize} height={pixelSize} unoptimized className="size-full object-cover" />
      ) : (
        <span>{(name || "家")[0]}</span>
      )}
    </span>
  );
}

function Thumb({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-14 shrink-0 place-items-center rounded-xl border-2 border-[#2B2A27] bg-[#FFF7EC] text-[#33312E]">
      {typeof children === "string" ? <AppIcon name={children} className="size-7" /> : children}
    </span>
  );
}

function LogoMark({ small = false, large = false, hero = false, imageScale = "" }: { small?: boolean; large?: boolean; hero?: boolean; imageScale?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center ${
        hero ? "size-[120px]" : large ? "mx-auto size-[62px]" : small ? "size-8 rounded-lg border-2 border-[#2B2A27] bg-[#FFF7EC] p-1" : "size-9 rounded-lg border-2 border-[#2B2A27] bg-[#FFF7EC] p-1"
      }`}
      aria-hidden="true"
    >
      <Image src="/nainai-alert-logo.svg" alt="" width={512} height={512} className={`size-full ${imageScale}`} priority={hero} />
    </span>
  );
}
