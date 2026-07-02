import {
  Home, Utensils, Car, Heart, BookOpen, Smile, Shirt, Briefcase, TrendingUp,
  MoreHorizontal, ShoppingCart, ShoppingBag, Gift, Plane, Bus, Bike, Train,
  Fuel, Dumbbell, GraduationCap, Stethoscope, Pill, Baby, Dog, Gamepad2, Music,
  Film, Coffee, Pizza, Wine, Wifi, Smartphone, Zap, Droplet, Flame, Wrench,
  Scissors, PawPrint, PiggyBank, Landmark, CreditCard, Banknote, DollarSign,
  Receipt, Building, Sofa, Tv, Umbrella, Package, Truck, Star, Tag, Phone,
  Mail, Key, Circle, type LucideIcon,
} from 'lucide-react'

/**
 * Base de ícones para categorias. As chaves são nomes kebab-case (mesmo padrão
 * salvo no banco em Category.icon). Compartilhado entre o seletor de categoria,
 * o modal de lançamento e a lista de lançamentos.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  'home': Home, 'utensils': Utensils, 'car': Car, 'heart': Heart,
  'book-open': BookOpen, 'smile': Smile, 'shirt': Shirt, 'briefcase': Briefcase,
  'trending-up': TrendingUp, 'more-horizontal': MoreHorizontal,
  'shopping-cart': ShoppingCart, 'shopping-bag': ShoppingBag, 'gift': Gift,
  'plane': Plane, 'bus': Bus, 'bike': Bike, 'train': Train, 'fuel': Fuel,
  'dumbbell': Dumbbell, 'graduation-cap': GraduationCap, 'stethoscope': Stethoscope,
  'pill': Pill, 'baby': Baby, 'dog': Dog, 'gamepad': Gamepad2, 'music': Music,
  'film': Film, 'coffee': Coffee, 'pizza': Pizza, 'wine': Wine, 'wifi': Wifi,
  'smartphone': Smartphone, 'zap': Zap, 'droplet': Droplet, 'flame': Flame,
  'wrench': Wrench, 'scissors': Scissors, 'paw-print': PawPrint,
  'piggy-bank': PiggyBank, 'landmark': Landmark, 'credit-card': CreditCard,
  'banknote': Banknote, 'dollar-sign': DollarSign, 'receipt': Receipt,
  'building': Building, 'sofa': Sofa, 'tv': Tv, 'umbrella': Umbrella,
  'package': Package, 'truck': Truck, 'star': Star, 'tag': Tag, 'phone': Phone,
  'mail': Mail, 'key': Key,
}

/** Ordem exibida no seletor de ícones. */
export const ICON_NAMES: string[] = Object.keys(ICON_MAP)

/** Paleta de cores sugeridas para categorias. */
export const CATEGORY_COLORS: string[] = [
  '#EF4444', '#F97316', '#FFA500', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#94A3B8',
]

interface CategoryIconProps {
  icon?: string
  className?: string
}

/** Renderiza o ícone lucide correspondente ao nome, com fallback para um círculo. */
export function CategoryIcon({ icon, className = 'h-4 w-4' }: CategoryIconProps) {
  const Icon = (icon && ICON_MAP[icon]) ? ICON_MAP[icon] : Circle
  return <Icon className={className} />
}
