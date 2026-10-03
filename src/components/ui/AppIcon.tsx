import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  CalendarCheck2,
  Camera,
  Check,
  Download,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react';

const iconMap = {
  dashboard: LayoutDashboard,
  attendance: CalendarCheck2,
  seminar: GraduationCap,
  video: Video,
  report: FileText,
  announcement: Megaphone,
  material: BookOpenText,
  admin: ShieldCheck,
  settings: Settings,
  users: Users,
  logout: LogOut,
  search: Search,
  filter: Filter,
  edit: Pencil,
  delete: Trash2,
  download: Download,
  back: ArrowLeft,
  pin: MapPin,
  upload: Upload,
  camera: Camera,
  check: Check,
  clear: X,
  arrowUpRight: ArrowUpRight,
  briefcase: BriefcaseBusiness,
  bell: Bell,
} satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof iconMap;

type AppIconProps = {
  name: AppIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function AppIcon({ name, size = 18, strokeWidth = 2, className }: AppIconProps) {
  const Icon = iconMap[name];
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
