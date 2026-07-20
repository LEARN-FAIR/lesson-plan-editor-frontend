import React from 'react';
import {useNavigate} from 'react-router-dom';
import {LogOut} from 'lucide-react';
import {useAuth} from '../../contexts/AuthContext';
import {useGitHubUser} from '../../services/githubQueryHooks';
import {Avatar, AvatarFallback, AvatarImage} from '../ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {Spinner} from '../ui/spinner';
import {initialsOf} from '../editor/editorTypes';

interface UserMenuProps {
    onLogout?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({onLogout}) => {
    const navigate = useNavigate();
    const {logout: authLogout} = useAuth();
    const {data: user, isLoading, error} = useGitHubUser();

    const handleLogout = () => {
        authLogout();
        onLogout?.();
        navigate('/login');
    };

    if (isLoading) {
        return (
            <div className="ml-2 flex items-center">
                <Spinner size={22} className="text-white" />
            </div>
        );
    }

    if (error || !user) {
        return null;
    }

    const displayName = user.name || user.login;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                title={displayName}
                className="ml-2 inline-flex cursor-pointer rounded-full outline-none ring-offset-2 ring-offset-navy focus-visible:ring-2 focus-visible:ring-white/70"
            >
                <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} alt={displayName} />
                    <AvatarFallback className="bg-teal-surface text-xs font-bold text-teal-ink">
                        {initialsOf(displayName)}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default UserMenu;
