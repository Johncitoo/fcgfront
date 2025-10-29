import * as React from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

type Props = React.ComponentProps<'input'> & {
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
};

export function PasswordInput({ value, onChange, error, className, ...rest }: Props) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(error && 'border-destructive pr-10', className)}
        {...rest}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}
