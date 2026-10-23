import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma, type TemplateCategory } from "../../../generated/prisma/client.js";
import type { TemplateCategoryInput, TemplateCategoryView } from "../types/template-category.types.js";
import { templateCategorySlug } from "./template-category-rules.js";

const countInclude = { _count: { select: { templates: true } } } as const satisfies Prisma.TemplateCategoryInclude;
type CategoryRow = Prisma.TemplateCategoryGetPayload<{ include: typeof countInclude }>;

const NOT_FOUND = () => new AppError(404, "Category not found", "CATEGORY_NOT_FOUND");
const NAME_TAKEN = () => new AppError(409, "A category with this name already exists.", "CATEGORY_NAME_TAKEN");
const SYSTEM = () => new AppError(400, "Built-in categories can't be renamed or deleted.", "CATEGORY_SYSTEM");

function toView(category: CategoryRow): TemplateCategoryView {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    isSystem: category.isSystem,
    templateCount: category._count.templates,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function prismaErrorCode(error: unknown): string | null {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
}

function slugOrThrow(name: string): string {
  const slug = templateCategorySlug(name);
  if (!slug) throw new AppError(400, "Use at least one letter or number.", "CATEGORY_NAME_INVALID");
  return slug;
}

/**
 * Super Admin management of template gallery categories. Only platform templates reference a category;
 * websites keep their own copy of a template's content, so no change here reaches an existing website.
 */
export class TemplateCategoryService {
  async list(): Promise<TemplateCategoryView[]> {
    const categories = await prisma.templateCategory.findMany({
      include: countInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return categories.map(toView);
  }

  async create(input: TemplateCategoryInput, actor: AuthUser): Promise<TemplateCategoryView> {
    const name = input.name.trim();
    const slug = slugOrThrow(name);
    const { _max } = await prisma.templateCategory.aggregate({ _max: { sortOrder: true } });
    try {
      const category = await prisma.templateCategory.create({
        data: { name, slug, sortOrder: (_max.sortOrder ?? -1) + 1 },
        include: countInclude,
      });
      logger.info({ categoryId: category.id, slug, actorId: actor.id }, "Template category created");
      return toView(category);
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") throw NAME_TAKEN();
      throw error;
    }
  }

  /** Also relabels its templates, so the gallery and new websites show the new name straight away. */
  async rename(categoryId: string, input: TemplateCategoryInput, actor: AuthUser): Promise<TemplateCategoryView> {
    const current = await this.findEditableOrThrow(categoryId);
    const name = input.name.trim();
    const slug = slugOrThrow(name);
    try {
      const category = await prisma.$transaction(async (tx) => {
        await tx.websiteTemplate.updateMany({ where: { categoryId }, data: { category: name } });
        return tx.templateCategory.update({ where: { id: categoryId }, data: { name, slug }, include: countInclude });
      });
      logger.info({ categoryId, from: current.name, to: name, actorId: actor.id }, "Template category renamed");
      return toView(category);
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") throw NAME_TAKEN();
      throw error;
    }
  }

  /**
   * A category that still has templates (archived ones too) is only deleted when `moveTo` names another
   * category to receive them; the move and the delete happen in one transaction.
   */
  async remove(categoryId: string, moveTo: string | undefined, actor: AuthUser): Promise<void> {
    await this.findEditableOrThrow(categoryId);
    if (moveTo === categoryId) {
      throw new AppError(400, "Choose a different category to move the templates to.", "CATEGORY_MOVE_SAME");
    }
    const target = moveTo ? await prisma.templateCategory.findUnique({ where: { id: moveTo } }) : null;
    if (moveTo && !target) throw new AppError(404, "The category to move templates to no longer exists.", "CATEGORY_NOT_FOUND");

    try {
      const moved = await prisma.$transaction(async (tx) => {
        const inUse = await tx.websiteTemplate.count({ where: { categoryId } });
        if (inUse > 0 && !target) {
          throw new AppError(
            409,
            `${inUse} ${inUse === 1 ? "template uses" : "templates use"} this category. Move them to another category first.`,
            "CATEGORY_IN_USE",
            { templateCount: inUse },
          );
        }
        const { count } = target
          ? await tx.websiteTemplate.updateMany({ where: { categoryId }, data: { categoryId: target.id, category: target.name } })
          : { count: 0 };
        await tx.templateCategory.delete({ where: { id: categoryId } });
        return count;
      });
      logger.info({ categoryId, movedTo: target?.id ?? null, movedTemplates: moved, actorId: actor.id }, "Template category deleted");
    } catch (error) {
      // A template was assigned between the count and the delete; the RESTRICT foreign key refused it.
      if (prismaErrorCode(error) === "P2003") {
        throw new AppError(409, "A template was just added to this category. Try again.", "CATEGORY_IN_USE");
      }
      throw error;
    }
  }

  /** The category a platform template is saved under; must exist at the time of writing. */
  async findOrThrow(categoryId: string): Promise<TemplateCategory> {
    const category = await prisma.templateCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new AppError(400, "That category no longer exists. Choose another.", "CATEGORY_NOT_FOUND");
    return category;
  }

  private async findEditableOrThrow(categoryId: string): Promise<TemplateCategory> {
    const category = await prisma.templateCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw NOT_FOUND();
    if (category.isSystem) throw SYSTEM();
    return category;
  }
}

export const templateCategoryService = new TemplateCategoryService();
