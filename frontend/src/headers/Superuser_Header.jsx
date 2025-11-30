import HeaderBase from './HeaderBase';

export default function Superuser_Header() {
    const links = [
        { to: '/dashboard', label: 'Home' },
        { to: '/admin', label: 'Admin' },
    ];
    return <HeaderBase brand="CSSU Rewards — Admin" links={links} />;
}
