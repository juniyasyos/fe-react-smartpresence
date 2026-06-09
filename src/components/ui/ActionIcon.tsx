import iconEdit from '../../assets/icons/reusable/edit.webp';
import iconHapus from '../../assets/icons/reusable/hapus.webp';
import iconMata from '../../assets/icons/reusable/mata.webp';
import iconUnduh from '../../assets/icons/reusable/unduh.webp';

const iconMap = {
  edit: iconEdit,
  hapus: iconHapus,
  mata: iconMata,
  unduh: iconUnduh,
} as const;

type IconName = keyof typeof iconMap;

interface ActionIconProps {
  name: IconName;
  size?: number;
  className?: string;
  alt?: string;
}

export default function ActionIcon({ name, size = 32, className = '', alt }: ActionIconProps) {
  return (
    <img
      src={iconMap[name]}
      alt={alt || name}
      className={`action-icon ${className}`}
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  );
}
