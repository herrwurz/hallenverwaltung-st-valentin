type PortalOrganization = {
  id: string;
  name: string;
};

type PortalOrganizationFieldProps = {
  organizations: PortalOrganization[];
  inputClassName: string;
};

export function PortalOrganizationField({
  organizations,
  inputClassName,
}: PortalOrganizationFieldProps) {
  if (organizations.length === 1) {
    return <input type="hidden" name="organizationId" value={organizations[0].id} />;
  }

  return (
    <label className="text-sm font-medium text-foreground">
      Organisation
      <select name="organizationId" required defaultValue="" className={inputClassName}>
        <option value="" disabled>
          Bitte wählen
        </option>
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
    </label>
  );
}
