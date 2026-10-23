export type TemplateCategoryView = {
  id: string;
  name: string;
  slug: string;
  /** Used by the built-in templates; cannot be renamed or deleted. */
  isSystem: boolean;
  /** Platform templates in this category, archived ones included. */
  templateCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TemplateCategoryInput = { name: string };

export type DeleteTemplateCategoryQuery = {
  /** Category that receives this category's templates; required when it still has any. */
  moveTo?: string;
};
