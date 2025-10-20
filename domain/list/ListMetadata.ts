/**
 * List Metadata Value Object
 * Encapsulates the metadata properties of a list with validation
 */
export class ListMetadata {
  private readonly _name: string;
  private readonly _icon: string;
  private readonly _color: string;

  constructor(name: string, icon: string, color: string) {
    this.validateName(name);
    this.validateIcon(icon);
    this.validateColor(color);
    
    this._name = name;
    this._icon = icon;
    this._color = color;
  }

  get name(): string {
    return this._name;
  }

  get icon(): string {
    return this._icon;
  }

  get color(): string {
    return this._color;
  }

  /**
   * Creates a new ListMetadata with updated name
   */
  withName(newName: string): ListMetadata {
    return new ListMetadata(newName, this._icon, this._color);
  }

  /**
   * Creates a new ListMetadata with updated icon
   */
  withIcon(newIcon: string): ListMetadata {
    return new ListMetadata(this._name, newIcon, this._color);
  }

  /**
   * Creates a new ListMetadata with updated color
   */
  withColor(newColor: string): ListMetadata {
    return new ListMetadata(this._name, this._icon, newColor);
  }

  /**
   * Validates that the name is not empty and not too long
   */
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('List name cannot be empty');
    }
    if (name.length > 100) {
      throw new Error('List name cannot exceed 100 characters');
    }
  }

  /**
   * Validates that the icon is a valid string
   */
  private validateIcon(icon: string): void {
    if (!icon || icon.trim().length === 0) {
      throw new Error('List icon cannot be empty');
    }
    if (icon.length > 50) {
      throw new Error('List icon cannot exceed 50 characters');
    }
  }

  /**
   * Validates that the color is a valid hex color or CSS color name
   */
  private validateColor(color: string): void {
    if (!color || color.trim().length === 0) {
      throw new Error('List color cannot be empty');
    }
    
    // Check for hex color format (#RRGGBB or #RGB)
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    // Check for CSS color names (basic validation)
    const cssColorNames = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
      'black', 'white', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
      'olive', 'teal', 'silver', 'maroon'
    ];
    
    if (!hexPattern.test(color) && !cssColorNames.includes(color.toLowerCase())) {
      throw new Error('List color must be a valid hex color (#RRGGBB) or CSS color name');
    }
  }

  /**
   * Checks equality with another ListMetadata
   */
  equals(other: ListMetadata): boolean {
    return this._name === other._name &&
           this._icon === other._icon &&
           this._color === other._color;
  }

  /**
   * Returns a string representation of the metadata
   */
  toString(): string {
    return `ListMetadata(name="${this._name}", icon="${this._icon}", color="${this._color}")`;
  }
}

