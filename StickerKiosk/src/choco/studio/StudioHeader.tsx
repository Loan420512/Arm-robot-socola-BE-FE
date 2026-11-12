import { Link } from 'react-router-dom';
import { ArrowLeft, ChefHat } from '@phosphor-icons/react';

export function StudioHeader() {
  return <header className="studio-header"><Link to="/" className="brand" aria-label="ChocoRobot, về trang chủ"><span className="brand-symbol"><ChefHat size={26} aria-hidden="true" /></span><span>choco<span className="brand-lightweight">robot</span><small>Chocolate plate studio</small></span></Link><Link className="button button-ghost" to="/"><ArrowLeft size={18} aria-hidden="true" />Trang chủ</Link></header>;
}
